import { REGULATION_43_URL } from '#/config/constants.js'
import { getLocale } from '#/server/common/helpers/i18n/get-locale.js'
import { withForwardedPrefix } from '#/server/common/helpers/proxy/forwarded-prefix.js'
import { getRegulatorDetails } from '#/server/routes/compliance/_shared/regulator.js'
import {
  selectSinglePrn,
  organisationsRouteOptions
} from '../../_shared/organisations-route-options.js'
import * as complianceMiddlewares from '#/server/routes/compliance/_middlewares/index.js'
import * as organisationsMiddlewares from '#/server/routes/organisations/_middlewares/index.js'

export const prnSingleController = {
  method: 'GET',
  path: '/organisations/{organisationId}/prns/{prnId}',
  options: {
    ...organisationsRouteOptions,
    pre: selectSinglePrn(
      complianceMiddlewares.organisation,
      organisationsMiddlewares.prn
    )
  },
  async handler(request, h) {
    const { organisationId } = request.params
    const { year } = request.query
    const { prn } = request.pre

    const regulator = getRegulatorDetails(
      request.pre?.organisation?.businessCountry,
      getLocale(request)
    )

    return h.view('organisations/prns/prn/index', {
      organisationId,
      organisationName: request.pre?.organisation?.name,
      year,
      prn,
      accesptHref: withForwardedPrefix(request),
      regulatorName: regulator.nameWithArticle,
      regulatorEmail: regulator.email,
      regulation43Url: REGULATION_43_URL
      // selectedPrnPath(schemeId) + `?year=${year}`
    })
  }
}

export const prnRoutes = [prnSingleController]
