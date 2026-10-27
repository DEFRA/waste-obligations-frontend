import { withQuery } from '#/server/common/helpers/paths.js'
import { prnRouteOptions } from './prns-route-options.js'
import { isPrnStatusEditable } from './prn-status.js'
import { submitPrnStatusUpdate } from './prn-status-update.js'
import {
  buildPrnConfirmGetController,
  resolvePrnConfirmContext
} from './prn-confirm-get-controller.js'

// Marks the PRN page reached immediately after a successful reject, matching
// the accept confirmation redirect.
function withRejectionConfirmation(path) {
  const [pathname, search = ''] = path.split('?')
  const query = Object.fromEntries(new URLSearchParams(search))

  return withQuery(pathname, { ...query, confirmed: '1' })
}

const CONFIRM_REJECT_VIEW = '_shared/prns/views/prn-confirm-reject'

/**
 * Builds the GET + POST routes for the "Are you sure you want to reject this
 * PRN?" page.
 *
 * The producer and CSO journeys are identical apart from their path param
 * (`organisationId` vs `schemeId`), their pre-handler list, and the PRN detail
 * path helper, so both are generated from this factory.
 *
 * POST sets the note to Rejected and loads the PRN page, which shows the
 * rejection confirmation. "No, go back" returns to the PRN detail page.
 *
 * @param {object} options
 * @param {string} options.path      Hapi route path for the confirmation page.
 * @param {string} options.paramKey  `'organisationId'` or `'schemeId'`.
 * @param {Array}  options.pre       Route `pre` handlers; must assign `prn`.
 * @param {(id: string, prnId: string, year: number) => string} options.prnPath
 *   Builds the PRN detail path to link / redirect back to.
 * @returns {[object, object]} `[getController, postController]`
 */
export function buildPrnConfirmRejectRoutes({ path, paramKey, pre, prnPath }) {
  const routeOptions = { ...prnRouteOptions, pre }

  const getController = buildPrnConfirmGetController({
    path,
    paramKey,
    pre,
    prnPath,
    view: CONFIRM_REJECT_VIEW
  })

  const postController = {
    method: 'POST',
    path,
    options: routeOptions,
    async handler(request, h) {
      const { prn, prnHref } = resolvePrnConfirmContext(
        request,
        paramKey,
        prnPath
      )

      if (!isPrnStatusEditable(prn)) {
        return h.redirect(prnHref)
      }

      const rejected = await submitPrnStatusUpdate(request, 'REJECTED')

      return h.redirect(rejected ? withRejectionConfirmation(prnHref) : prnHref)
    }
  }

  return [getController, postController]
}
