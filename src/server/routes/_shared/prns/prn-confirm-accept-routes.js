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

// The year picked on the "choose year" page. Only honoured when it is one of
// the years this PRN can currently be accepted into.
function resolveChosenAcceptYear(request, prn) {
  const acceptYear = Number(request.query.acceptYear)

  return resolveAvailableAcceptanceYears(prn).includes(acceptYear)
    ? acceptYear
    : undefined
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
      acceptYear: resolveChosenAcceptYear(request, prn)
    }
  }

  const getController = {
    method: 'GET',
    path,
    options: routeOptions,
    handler(request, h) {
      const { id, prnId, prn, year, prnHref, acceptYear } =
        resolveContext(request)

      if (!isPrnStatusEditable(prn)) {
        return h.redirect(prnHref)
      }

      const backHref = withForwardedPrefix(request, prnHref)
      const chooseYearHref =
        acceptYear && chooseYearPath
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
      const { prn, prnHref } = resolveContext(request)

      if (!isPrnStatusEditable(prn)) {
        return h.redirect(prnHref)
      }

      const accepted = await submitPrnStatusUpdate(request, 'ACCEPTED')

      return h.redirect(
        accepted ? withAcceptanceConfirmation(prnHref) : prnHref
      )
    }
  }

  return [getController, postController]
}
