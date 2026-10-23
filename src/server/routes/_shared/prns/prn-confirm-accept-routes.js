import { withQuery } from '#/server/common/helpers/paths.js'
import { prnRouteOptions } from './prns-route-options.js'
import { isPrnStatusEditable } from './prn-status.js'
import { submitPrnStatusUpdate } from './prn-status-update.js'
import {
  buildPrnConfirmGetController,
  resolvePrnConfirmContext
} from './prn-confirm-get-controller.js'

// Marks the page reached immediately after a successful accept, so the
// download link sits in the green confirmation banner rather than at the base.
function withAcceptanceConfirmation(path) {
  const [pathname, search = ''] = path.split('?')
  const query = Object.fromEntries(new URLSearchParams(search))

  return withQuery(pathname, { ...query, confirmed: '1' })
}

const CONFIRM_ACCEPT_VIEW = '_shared/prns/views/prn-confirm-accept'

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
  const routeOptions = { ...prnRouteOptions, pre }

  const getController = buildPrnConfirmGetController({
    path,
    paramKey,
    pre,
    prnPath,
    view: CONFIRM_ACCEPT_VIEW,
    // Only the PRN's own obligationYear is authoritative. `year` (which may
    // fall back to the query param) is fine for the back-link URL but must
    // not be asserted as fact in the confirmation copy, so the template
    // omits the year when this is undefined.
    extraModel: (prn) => ({ obligationYear: prn.obligationYear })
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

      const accepted = await submitPrnStatusUpdate(request, 'ACCEPTED')

      return h.redirect(
        accepted ? withAcceptanceConfirmation(prnHref) : prnHref
      )
    }
  }

  return [getController, postController]
}
