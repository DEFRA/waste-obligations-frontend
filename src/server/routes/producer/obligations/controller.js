import { renderValidationFailAction } from '#/server/common/helpers/validation-fail-action.js'
import { buildPrnsCsvRoute } from '#/server/routes/_shared/obligations/prns-csv-routes.js'
import { buildComplianceRecordRoute } from '#/server/routes/_shared/obligations/compliance-record-routes.js'
import { buildObligationsChooseYearRoutes } from '#/server/routes/_shared/obligations/choose-year-routes.js'
import {
  producerComplianceRecordPath,
  producerObligationsHomePath,
  producerObligationMaterialPath,
  producerPrnsCsvPath
} from '#/server/routes/_shared/obligations/obligations-paths.js'
import { buildObligationsYearRule } from '#/server/routes/_shared/obligations/_middlewares/obligations-year-rule.js'
import * as middlewares from '#/server/routes/_shared/obligations/_middlewares/index.js'
import {
  producerObligationsPre,
  producerObligationsRouteOptions
} from '#/server/routes/_shared/obligations/obligations-route-options.js'
import {
  producerObligationsParamsSchema,
  producerObligationMaterialParamsSchema,
  obligationsYearQuerySchema
} from '#/server/routes/_shared/obligations/schema.js'
import { buildMaterialCalculationViewModel } from '#/server/routes/_shared/obligations/view-model/material-calculation-view-model.js'
import { buildManageObligationsViewModel } from '#/server/routes/_shared/obligations/view-model/manage-obligations-view-model.js'

const obligationsYearRule = buildObligationsYearRule({
  paramKey: 'organisationId',
  obligationsPath: producerObligationsHomePath,
  compliancePath: producerComplianceRecordPath
})

const obligationMaterialYearRule = buildObligationsYearRule({
  paramKey: 'organisationId',
  obligationsPath: (id, year, request) =>
    producerObligationMaterialPath(id, request.params.material, year),
  compliancePath: producerComplianceRecordPath
})

export const obligationsHomeController = {
  method: 'GET',
  path: '/producer/{organisationId}/obligations',
  options: {
    ...producerObligationsRouteOptions,
    pre: producerObligationsPre(
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
      userType: 'producer',
      obligationYear
    })

    return h.view('_shared/obligations/views/obligations-home', viewModel)
  }
}

export const obligationMaterialController = {
  method: 'GET',
  path: '/producer/{organisationId}/obligations/{material}',
  options: {
    validate: {
      params: producerObligationMaterialParamsSchema,
      query: obligationsYearQuerySchema,
      failAction: renderValidationFailAction
    },
    pre: [
      middlewares.currentOrganisation,
      middlewares.approvedUser,
      obligationMaterialYearRule,
      middlewares.organisation,
      middlewares.obligationsForYear
    ]
  },
  handler(request, h) {
    const viewModel = buildMaterialCalculationViewModel({
      request,
      userType: 'producer',
      obligationYear: request.query.year,
      material: request.params.material
    })

    return h.view('_shared/obligations/views/obligation-material', viewModel)
  }
}

export const obligationsChooseYearRoutes = buildObligationsChooseYearRoutes({
  path: '/producer/{organisationId}/obligations/choose-year',
  paramKey: 'organisationId',
  paramsSchema: producerObligationsParamsSchema,
  pre: [middlewares.currentOrganisation, middlewares.allUsers],
  obligationsPath: producerObligationsHomePath,
  compliancePath: producerComplianceRecordPath
})

export const obligationsComplianceRecordRoute = buildComplianceRecordRoute({
  path: '/producer/{organisationId}/obligations/compliance-record',
  paramsSchema: producerObligationsParamsSchema,
  pre: [
    middlewares.currentOrganisation,
    middlewares.allUsers,
    middlewares.organisation
  ],
  isProducer: true,
  paramKey: 'organisationId',
  downloadPrnsPath: producerPrnsCsvPath
})

export const obligationsPrnsCsvRoute = buildPrnsCsvRoute({
  path: '/producer/{organisationId}/obligations/compliance-record/prns.csv',
  paramKey: 'organisationId',
  paramsSchema: producerObligationsParamsSchema,
  pre: [middlewares.currentOrganisation, middlewares.allUsers],
  backPath: (id) => producerComplianceRecordPath(id)
})

export const obligationsRoutes = [
  obligationsHomeController,
  obligationMaterialController,
  ...obligationsChooseYearRoutes,
  obligationsComplianceRecordRoute,
  obligationsPrnsCsvRoute
]
