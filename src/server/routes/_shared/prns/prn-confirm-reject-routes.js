import { withQuery } from '#/server/common/helpers/paths.js'
import { getLocale } from '#/server/common/helpers/i18n/get-locale.js'
import { translate } from '#/server/common/helpers/i18n/translate.js'
import { prnRouteOptions } from './prns-route-options.js'
import { isPrnStatusEditable } from './prn-status.js'
import { submitPrnStatusUpdate } from './prn-status-update.js'
import {
  buildPrnConfirmGetController,
  buildPrnConfirmViewModel,
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

const CONFIRM_REJECT_FIELD_ID = 'confirmReject'
const REJECT_CHOICE = 'yes'
const GO_BACK_CHOICE = 'no'

function buildChoiceRequiredErrors(request) {
  const message = translate(
    getLocale(request),
    'prns.confirmReject.errors.chooseOption'
  )

  return {
    summary: [{ text: message, href: `#${CONFIRM_REJECT_FIELD_ID}` }],
    message
  }
}

/**
 * Builds the GET + POST routes for the "Are you sure you want to reject this
 * PRN?" page.
 *
 * The producer and CSO journeys are identical apart from their path param
 * (`organisationId` vs `schemeId`), their pre-handler list, and the PRN detail
 * path helper, so both are generated from this factory.
 *
 * POST reads the radio choice: "Yes, reject" sets the note to Rejected and
 * loads the PRN page, which shows the rejection confirmation; "No, go back"
 * returns to the PRN detail page; no choice shows the page again with an error.
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
      const context = resolvePrnConfirmContext(request, paramKey, prnPath)
      const { prn, prnHref } = context

      if (!isPrnStatusEditable(prn)) {
        return h.redirect(prnHref)
      }

      const choice = request.payload?.[CONFIRM_REJECT_FIELD_ID]

      if (choice === GO_BACK_CHOICE) {
        return h.redirect(prnHref)
      }

      if (choice !== REJECT_CHOICE) {
        return h.view(CONFIRM_REJECT_VIEW, {
          ...buildPrnConfirmViewModel(request, paramKey, context),
          formErrors: buildChoiceRequiredErrors(request)
        })
      }

      const rejected = await submitPrnStatusUpdate(request, 'REJECTED')

      return h.redirect(rejected ? withRejectionConfirmation(prnHref) : prnHref)
    }
  }

  return [getController, postController]
}
