import { renderValidationFailAction } from '#/server/common/helpers/validation-fail-action.js'
import * as middlewares from '#/server/routes/_shared/obligations/_middlewares/index.js'
import {
  producerObligationsParamsSchema,
  obligationsQuerySchema
} from '#/server/routes/_shared/obligations/schema.js'
import { buildManageObligationsViewModel } from '#/server/routes/_shared/obligations/view-model/manage-obligations-view-model.js'

export const obligationsHomeController = {
  method: 'GET',
  path: '/producer/{organisationId}/obligations',
  options: {
    validate: {
      params: producerObligationsParamsSchema,
      query: obligationsQuerySchema,
      failAction: renderValidationFailAction
    },
    pre: [
      middlewares.currentOrganisation,
      middlewares.approvedUser,
      middlewares.organisation,
      middlewares.obligationsForYear,
      middlewares.awaitingAcceptancePrns
    ]
  },
  handler(request, h) {
    const obligationYear = request.query.year ?? new Date().getFullYear()

    const viewModel = buildManageObligationsViewModel({
      request,
      userType: 'producer',
      obligationYear
    })

    return h.view('_shared/obligations/views/obligations-home', viewModel)
  }
}

export const obligationsRoutes = [obligationsHomeController]
