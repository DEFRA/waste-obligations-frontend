import { now } from '#/server/common/helpers/clock.js'
import { withQuery } from '#/server/common/helpers/paths.js'
import { withForwardedPrefix } from '#/server/common/helpers/proxy/forwarded-prefix.js'
import { prnRouteOptions } from './prns-route-options.js'
import { isPrnStatusEditable } from './prn-status.js'
import { submitPrnStatusUpdate } from './prn-status-update.js'
import { resolveAvailableAcceptanceYears } from './available-acceptance-years.js'

// Marks the page reached immediately after a successful accept, so the
// download link sits in the green confirmation banner rather than at the base.
function withAcceptanceConfirmation(path) {
  const [pathname, search = ''] = path.split('?')
  const query = Object.fromEntries(new URLSearchParams(search))

  return withQuery(pathname, { ...query, confirmed: '1' })
}

const CONFIRM_ACCEPT_VIEW = '_shared/prns/views/prn-confirm-accept'

/**
 * The obligation year this acceptance will be recorded against.
 *
 * - the year picked on the "choose year" page, when it is one the PRN can
 *   currently be accepted into
 * - for a December waste PRN with only one year available (for example a
 *   2026 PRN accepted from February 2027), that single year: the PRN's own year
 *   is no longer the right one to record
 * - otherwise null (standard PRNs keep their own year)
 *
 * `choiceRequired` is true when the PRN can go into several years but none was
 * chosen, so it must not be accepted yet.
 *
 * `staleChoice` is true when a year was chosen but is no longer offered (the
 * choice window closed in between). The single remaining year is shown, but a
 * POST must not record it: the user confirmed a different year.
 */
function resolveAcceptYear(request, prn) {
  const availableYears = resolveAvailableAcceptanceYears(prn, { now: now() })
  const chosenYear = Number(request.query.acceptYear)
  const yearWasSupplied =
    request.query.acceptYear !== undefined && request.query.acceptYear !== ''

  if (availableYears.includes(chosenYear)) {
    return {
      acceptYear: chosenYear,
      wasChosen: true,
      choiceRequired: false,
      staleChoice: false
    }
  }

  if (prn?.decemberWaste && availableYears.length === 1) {
    return {
      acceptYear: availableYears[0],
      wasChosen: false,
      choiceRequired: false,
      staleChoice: yearWasSupplied
    }
  }

  return {
    acceptYear: null,
    wasChosen: false,
    choiceRequired: availableYears.length > 1,
    staleChoice: false
  }
}

function buildContext(request, { paramKey, prnPath }) {
  const id = request.params[paramKey]
  const { prnId } = request.params
  const { prn } = request.pre
  const year = request.query.year

  return {
    id,
    prnId,
    prn,
    year,
    prnHref: prnPath(id, prnId, year),
    ...resolveAcceptYear(request, prn)
  }
}

// A PRN with a choice of years cannot be accepted until one is chosen.
function chooseYearRedirect(context, chooseYearPath) {
  const { id, prnId, year, choiceRequired } = context

  return choiceRequired && chooseYearPath
    ? chooseYearPath(id, prnId, year)
    : null
}

function buildConfirmView(request, context, { paramKey, chooseYearPath }) {
  const { id, prnId, prn, year, prnHref, acceptYear, wasChosen } = context
  const backHref = withForwardedPrefix(request, prnHref)
  const chooseYearHref =
    wasChosen && chooseYearPath
      ? withForwardedPrefix(request, chooseYearPath(id, prnId, year))
      : backHref

  return {
    [paramKey]: id,
    prnId,
    // Only the PRN's own obligationYear (or the year chosen for it) is
    // authoritative. `year` (which may fall back to the query param) is fine
    // for the back-link URL but must not be asserted as fact in the
    // confirmation copy, so the template omits the year when this is undefined.
    obligationYear: acceptYear ?? prn.obligationYear,
    prn,
    backLink: chooseYearHref,
    goBackHref: backHref
  }
}

/**
 * Builds the GET + POST routes for the PRN "are you sure you want to accept this
 * PRN" confirmation page.
 *
 * The producer and CSO journeys are identical apart from their path param
 * (`organisationId` vs `schemeId`), their pre-handler list, and the PRN detail
 * path helper, so both are generated from this factory.
 *
 * @param {object} options
 * @param {string} options.path      Hapi route path for the confirmation page.
 * @param {string} options.paramKey  `'organisationId'` or `'schemeId'`.
 * @param {Array}  options.pre       Route `pre` handlers; must assign `prn`.
 * @param {(id: string, prnId: string, year: number) => string} options.prnPath
 *   Builds the PRN detail path to link / redirect back to.
 * @param {(id: string, prnId: string, year?: number) => string} [options.chooseYearPath]
 *   Builds the "choose year" path: where to send a PRN that still needs a year
 *   chosen, and the back link once one has been.
 * @returns {[object, object]} `[getController, postController]`
 */
export function buildPrnConfirmAcceptRoutes({
  path,
  paramKey,
  pre,
  prnPath,
  chooseYearPath
}) {
  const routeOptions = { ...prnRouteOptions, pre }

  const getController = {
    method: 'GET',
    path,
    options: routeOptions,
    handler(request, h) {
      const context = buildContext(request, { paramKey, prnPath })

      if (!isPrnStatusEditable(context.prn)) {
        return h.redirect(context.prnHref)
      }

      const chooseHref = chooseYearRedirect(context, chooseYearPath)

      if (chooseHref) {
        return h.redirect(chooseHref)
      }

      return h.view(
        CONFIRM_ACCEPT_VIEW,
        buildConfirmView(request, context, { paramKey, chooseYearPath })
      )
    }
  }

  const postController = {
    method: 'POST',
    path,
    options: routeOptions,
    async handler(request, h) {
      const context = buildContext(request, { paramKey, prnPath })

      if (!isPrnStatusEditable(context.prn)) {
        return h.redirect(context.prnHref)
      }

      const chooseHref = chooseYearRedirect(context, chooseYearPath)

      if (chooseHref) {
        return h.redirect(chooseHref)
      }

      if (context.staleChoice) {
        // Back to the confirmation, which shows the year it would now be
        // recorded under, rather than accepting into a year not confirmed.
        return h.redirect(withQuery(request.path, { year: context.year }))
      }

      const accepted = await submitPrnStatusUpdate(request, 'ACCEPTED', {
        obligationYear: context.acceptYear
      })

      return h.redirect(
        accepted ? withAcceptanceConfirmation(context.prnHref) : context.prnHref
      )
    }
  }

  return [getController, postController]
}
