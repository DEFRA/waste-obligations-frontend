import { buildPrnConfirmGetController } from './prn-confirm-get-controller.js'

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
  return [
    buildPrnConfirmGetController({
      path,
      paramKey,
      pre,
      prnPath,
      view: CONFIRM_REJECT_VIEW
    })
  ]
}
