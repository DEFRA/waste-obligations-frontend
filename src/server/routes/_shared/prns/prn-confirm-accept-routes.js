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
 * - otherwise undefined (standard PRNs keep their own year)
 *
 * `choiceRequired` is true when the PRN can go into several years but none was
 * chosen, so it must not be accepted yet.
 */
function resolveAcceptYear(request, prn) {
  const availableYears = resolveAvailableAcceptanceYears(prn)
  const chosenYear = Number(request.query.acceptYear)

  if (availableYears.includes(chosenYear)) {
    return { acceptYear: chosenYear, wasChosen: true, choiceRequired: false }
  }

  if (prn?.decemberWaste && availableYears.length === 1) {
    return {
      acceptYear: availableYears[0],
      wasChosen: false,
      choiceRequired: false
    }
  }

  return {
    acceptYear: undefined,
    wasChosen: false,
    choiceRequired: availableYears.length > 1
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
 *   Builds the "choose year" path, used as the back link when a year was chosen.
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

  function resolveContext(request) {
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
  function redirectToChooseYear(id, prnId, year) {
    return chooseYearPath ? chooseYearPath(id, prnId, year) : null
  }

  const getController = {
    method: 'GET',
    path,
    options: routeOptions,
    handler(request, h) {
      const {
        id,
        prnId,
        prn,
        year,
        prnHref,
        acceptYear,
        wasChosen,
        choiceRequired
      } = resolveContext(request)

      if (!isPrnStatusEditable(prn)) {
        return h.redirect(prnHref)
      }

      const chooseHref = choiceRequired && redirectToChooseYear(id, prnId, year)

      if (chooseHref) {
        return h.redirect(chooseHref)
      }

      const backHref = withForwardedPrefix(request, prnHref)
      const chooseYearHref =
        wasChosen && chooseYearPath
          ? withForwardedPrefix(request, chooseYearPath(id, prnId, year))
          : backHref

      return h.view(CONFIRM_ACCEPT_VIEW, {
        [paramKey]: id,
        prnId,
        // Only the PRN's own obligationYear is authoritative. `year` (which may
        // fall back to the query param) is fine for the back-link URL but must
        // not be asserted as fact in the confirmation copy, so the template
        // omits the year when this is undefined.
        obligationYear: acceptYear ?? prn.obligationYear,
        prn,
        backLink: chooseYearHref,
        goBackHref: backHref
      })
    }
  }

  const postController = {
    method: 'POST',
    path,
    options: routeOptions,
    async handler(request, h) {
      const { id, prnId, prn, year, prnHref, acceptYear, choiceRequired } =
        resolveContext(request)

      if (!isPrnStatusEditable(prn)) {
        return h.redirect(prnHref)
      }

      const chooseHref = choiceRequired && redirectToChooseYear(id, prnId, year)

      if (chooseHref) {
        return h.redirect(chooseHref)
      }

      const accepted = await submitPrnStatusUpdate(request, 'ACCEPTED', {
        obligationYear: acceptYear
      })

      return h.redirect(
        accepted ? withAcceptanceConfirmation(prnHref) : prnHref
      )
    }
  }

  return [getController, postController]
}
