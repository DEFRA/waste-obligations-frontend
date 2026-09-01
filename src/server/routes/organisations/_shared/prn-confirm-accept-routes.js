import { withForwardedPrefix } from '#/server/common/helpers/proxy/forwarded-prefix.js'
import { organisationsPrnRouteOptions } from './organisations-route-options.js'
import { isPrnStatusEditable } from './prn-status.js'
import { submitPrnStatusUpdate } from './prn-status-update.js'
import { resolvePrnYear } from './resolve-prn-year.js'

const CONFIRM_ACCEPT_VIEW = 'organisations/views/prn-confirm-accept'

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
 * @returns {[object, object]} `[getController, postController]`
 */
export function buildPrnConfirmAcceptRoutes({ path, paramKey, pre, prnPath }) {
  const routeOptions = { ...organisationsPrnRouteOptions, pre }

  function resolveContext(request) {
    const id = request.params[paramKey]
    const { prnId } = request.params
    const { prn } = request.pre
    const year = resolvePrnYear(request.query.year, prn)

    return { id, prnId, prn, year, prnHref: prnPath(id, prnId, year) }
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

      return h.view(CONFIRM_ACCEPT_VIEW, {
        [paramKey]: id,
        prnId,
        // Only the PRN's own obligationYear is authoritative. `year` (which may
        // fall back to the query param or the current year) is fine for the
        // back-link URL but must not be asserted as fact in the confirmation
        // copy, so the template omits the year when this is undefined.
        obligationYear: prn.obligationYear,
        prn,
        goBackHref: withForwardedPrefix(request, prnHref)
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

      await submitPrnStatusUpdate(request, 'ACCEPTED')

      return h.redirect(prnHref)
    }
  }

  return [getController, postController]
}
