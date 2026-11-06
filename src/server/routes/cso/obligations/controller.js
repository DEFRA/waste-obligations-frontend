import { renderValidationFailAction } from '#/server/common/helpers/validation-fail-action.js'
import { buildComplianceRecordRoute } from '#/server/routes/_shared/obligations/compliance-record-routes.js'
import { buildObligationsChooseYearRoutes } from '#/server/routes/_shared/obligations/choose-year-routes.js'
import {
  csoComplianceRecordPath,
  csoObligationsHomePath,
  csoObligationMaterialPath
} from '#/server/routes/_shared/obligations/obligations-paths.js'
import { buildObligationsYearRule } from '#/server/routes/_shared/obligations/_middlewares/obligations-year-rule.js'
import * as middlewares from '#/server/routes/_shared/obligations/_middlewares/index.js'
import {
  csoObligationsPre,
  csoObligationsRouteOptions
} from '#/server/routes/_shared/obligations/obligations-route-options.js'
import {
  csoObligationsParamsSchema,
  csoObligationMaterialParamsSchema,
  obligationsQuerySchema
} from '#/server/routes/_shared/obligations/schemas.js'
import { buildMaterialCalculationViewModel } from '#/server/routes/_shared/obligations/view-model/material-calculation-view-model.js'
import { buildManageObligationsViewModel } from '#/server/routes/_shared/obligations/view-model/manage-obligations-view-model.js'

const obligationsYearRule = buildObligationsYearRule({
  paramKey: 'schemeId',
  obligationsPath: csoObligationsHomePath,
  compliancePath: csoComplianceRecordPath
})

const obligationMaterialYearRule = buildObligationsYearRule({
  paramKey: 'schemeId',
  obligationsPath: (id, year, request) =>
    csoObligationMaterialPath(id, request.params.material, year),
  compliancePath: csoComplianceRecordPath
})

export const obligationsHomeController = {
  method: 'GET',
  path: '/cso/{schemeId}/obligations',
  options: {
    ...csoObligationsRouteOptions,
    pre: csoObligationsPre(
      middlewares.allUsers,
      obligationsYearRule,
      middlewares.organisation,
      middlewares.obligationsForYear,
      middlewares.declarations,
      middlewares.awaitingAcceptancePrns
    )
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
      obligationMaterialYearRule,
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

export const obligationsChooseYearRoutes = buildObligationsChooseYearRoutes({
  path: '/cso/{schemeId}/obligations/choose-year',
  paramKey: 'schemeId',
  paramsSchema: csoObligationsParamsSchema,
  pre: [middlewares.currentComplianceScheme, middlewares.allUsers],
  obligationsPath: csoObligationsHomePath,
  compliancePath: csoComplianceRecordPath
})

export const obligationsComplianceRecordRoute = buildComplianceRecordRoute({
  path: '/cso/{schemeId}/obligations/compliance-record',
  paramsSchema: csoObligationsParamsSchema,
  pre: [
    middlewares.currentComplianceScheme,
    middlewares.allUsers,
    middlewares.organisation
  ],
  isProducer: false
})

export const obligationsRoutes = [
  obligationsHomeController,
  obligationMaterialController,
  ...obligationsChooseYearRoutes,
  obligationsComplianceRecordRoute
]
