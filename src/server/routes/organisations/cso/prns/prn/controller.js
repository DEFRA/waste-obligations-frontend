import { REGULATION_43_URL } from '#/config/constants.js'
import { getLocale } from '#/server/common/helpers/i18n/get-locale.js'
import { withForwardedPrefix } from '#/server/common/helpers/proxy/forwarded-prefix.js'
import { getRegulatorDetails } from '#/server/routes/compliance/_shared/regulator.js'
import { csoPrnsPath } from '#/server/routes/organisations/_shared/organisations-paths.js'
import {
  singleSchemePrn,
  organisationsRouteOptions
} from '#/server/routes/organisations/_shared/organisations-route-options.js'
import * as complianceMiddlewares from '#/server/routes/compliance/_middlewares/index.js'
import * as organisationsMiddlewares from '#/server/routes/organisations/cso/_middlewares/index.js'

export const prnSingleController = {
  method: 'GET',
  path: '/organisations/cso/{schemeId}/prns/{prnId}',
  options: {
    ...organisationsRouteOptions,
    pre: singleSchemePrn(
      complianceMiddlewares.organisation,
      organisationsMiddlewares.prn
    )
  },
  async handler(request, h) {
    const { schemeId } = request.params
    const { year } = request.query
    const { prn } = request.pre

    const regulator = getRegulatorDetails(
      request.pre?.organisation?.businessCountry,
      getLocale(request)
    )

    return h.view('organisations/views/prn', {
      schemeId,
      organisationName: request.pre?.organisation?.name,
      year,
      prn,
      backLink: withForwardedPrefix(request, csoPrnsPath(schemeId)),
      accesptHref: withForwardedPrefix(request),
      regulatorName: regulator.nameWithArticle,
      regulatorEmail: regulator.email,
      regulation43Url: REGULATION_43_URL
    })
  }
}

export const prnRoutes = [prnSingleController]
