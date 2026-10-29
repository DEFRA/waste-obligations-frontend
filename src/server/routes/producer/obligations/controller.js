import * as middlewares from '#/server/routes/_shared/obligations/_middlewares/index.js'
import {
  producerObligationsPre,
  producerObligationsRouteOptions
} from '#/server/routes/_shared/obligations/obligations-route-options.js'
import { buildManageObligationsViewModel } from '#/server/routes/_shared/obligations/view-model/manage-obligations-view-model.js'

export const obligationsHomeController = {
  method: 'GET',
  path: '/producer/{organisationId}/obligations',
  options: {
    ...producerObligationsRouteOptions,
    pre: producerObligationsPre(
      middlewares.currentOrganisation,
      middlewares.allUsers,
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

export const obligationsRoutes = [obligationsHomeController]
