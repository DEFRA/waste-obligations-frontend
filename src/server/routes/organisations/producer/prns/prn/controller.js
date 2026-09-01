import { REGULATION_43_URL } from '#/config/constants.js'
import { getLocale } from '#/server/common/helpers/i18n/get-locale.js'
import { withForwardedPrefix } from '#/server/common/helpers/proxy/forwarded-prefix.js'
import { getRegulatorDetails } from '#/server/routes/compliance/_shared/regulator.js'
import { producerPrnsPath } from '#/server/routes/organisations/_shared/organisations-paths.js'
import { resolvePrnYear } from '#/server/routes/organisations/_shared/resolve-prn-year.js'
import {
  singlePrn,
  organisationsRouteOptions
} from '#/server/routes/organisations/_shared/organisations-route-options.js'
import * as complianceMiddlewares from '#/server/routes/compliance/_middlewares/index.js'
import * as organisationsMiddlewares from '#/server/routes/organisations/producer/_middlewares/index.js'

export const prnSingleController = {
  method: 'GET',
  path: '/organisations/producer/{organisationId}/prns/{prnId}',
  options: {
    ...organisationsRouteOptions,
    pre: singlePrn(
      complianceMiddlewares.organisation,
      organisationsMiddlewares.prn
    )
  },
  async handler(request, h) {
    const { organisationId } = request.params
    const { prn } = request.pre
    const year = resolvePrnYear(request.query.year, prn)

    const regulator = getRegulatorDetails(
      request.pre?.organisation?.businessCountry,
      getLocale(request)
    )

    return h.view('organisations/views/prn', {
      organisationId,
      organisationName: request.pre?.organisation?.name,
      year,
      prn,
      backLink: withForwardedPrefix(request, producerPrnsPath(organisationId)),
      regulatorName: regulator.nameWithArticle,
      regulatorEmail: regulator.email,
      regulation43Url: REGULATION_43_URL
    })
  }
}

export const prnRoutes = [prnSingleController]
