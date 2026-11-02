import { renderValidationFailAction } from '#/server/common/helpers/validation-fail-action.js'
import * as middlewares from '#/server/routes/_shared/obligations/_middlewares/index.js'
import {
  csoObligationsParamsSchema,
  csoObligationMaterialParamsSchema,
  obligationsQuerySchema
} from '#/server/routes/_shared/obligations/schema.js'
import { buildMaterialCalculationViewModel } from '#/server/routes/_shared/obligations/view-model/material-calculation-view-model.js'
import { buildManageObligationsViewModel } from '#/server/routes/_shared/obligations/view-model/manage-obligations-view-model.js'

export const obligationsHomeController = {
  method: 'GET',
  path: '/cso/{schemeId}/obligations',
  options: {
    validate: {
      params: csoObligationsParamsSchema,
      query: obligationsQuerySchema,
      failAction: renderValidationFailAction
    },
    pre: [
      middlewares.currentComplianceScheme,
      middlewares.approvedUser,
      middlewares.organisation,
      middlewares.obligationsForYear,
      middlewares.awaitingAcceptancePrns
    ]
  },
  handler(request, h) {
    const obligationYear = request.query.year

    const viewModel = buildManageObligationsViewModel({
      request,
      userType: 'cso',
      obligationYear
    })

    return h.view('_shared/obligations/views/obligations-home', viewModel)
  }
}

export const obligationMaterialController = {
  method: 'GET',
  path: '/cso/{schemeId}/obligations/{material}',
  options: {
    validate: {
      params: csoObligationMaterialParamsSchema,
      query: obligationsQuerySchema,
      failAction: renderValidationFailAction
    },
    pre: [
      middlewares.currentComplianceScheme,
      middlewares.approvedUser,
      middlewares.organisation,
      middlewares.obligationsForYear
    ]
  },
  handler(request, h) {
    const viewModel = buildMaterialCalculationViewModel({
      request,
      userType: 'cso',
      obligationYear: request.query.year,
      material: request.params.material
    })

    return h.view('_shared/obligations/views/obligation-material', viewModel)
  }
}

export const obligationsRoutes = [
  obligationsHomeController,
  obligationMaterialController
]
