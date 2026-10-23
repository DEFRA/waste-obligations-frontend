import { withForwardedPrefix } from '#/server/common/helpers/proxy/forwarded-prefix.js'
import { prnRouteOptions } from './prns-route-options.js'
import { isPrnStatusEditable } from './prn-status.js'

const CONFIRM_REJECT_VIEW = '_shared/prns/views/prn-confirm-reject'

/**
 * Builds the GET route for the "Are you sure you want to reject this PRN?" page.
 *
 * The producer and CSO journeys are identical apart from their path param
 * (`organisationId` vs `schemeId`), their pre-handler list, and the PRN detail
 * path helper, so both are generated from this factory.
 *
 * Setting the note to Rejected, and the rejection confirmation view, are later
 * stories. This page does not post a status change. "No, go back" returns to
 * the PRN detail page.
 *
 * @param {object} options
 * @param {string} options.path      Hapi route path for the confirmation page.
 * @param {string} options.paramKey  `'organisationId'` or `'schemeId'`.
 * @param {Array}  options.pre       Route `pre` handlers; must assign `prn`.
 * @param {(id: string, prnId: string, year: number) => string} options.prnPath
 *   Builds the PRN detail path to link / redirect back to.
 * @returns {[object]} `[getController]`
 */
export function buildPrnConfirmRejectRoutes({ path, paramKey, pre, prnPath }) {
  const routeOptions = { ...prnRouteOptions, pre }

  function resolveContext(request) {
    const id = request.params[paramKey]
    const { prnId } = request.params
    const { prn } = request.pre
    const year = request.query.year

    return { id, prnId, prn, prnHref: prnPath(id, prnId, year) }
  }

  const getController = {
    method: 'GET',
    path,
    options: routeOptions,
    handler(request, h) {
      const { id, prnId, prn, prnHref } = resolveContext(request)

      if (!isPrnStatusEditable(prn)) {
        return h.redirect(prnHref)
      }

      const backHref = withForwardedPrefix(request, prnHref)

      return h.view(CONFIRM_REJECT_VIEW, {
        [paramKey]: id,
        prnId,
        prn,
        backLink: backHref,
        goBackHref: backHref
      })
    }
  }

  return [getController]
}
