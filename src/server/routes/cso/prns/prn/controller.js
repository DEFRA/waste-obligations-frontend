import { REGULATION_43_URL } from '#/config/constants.js'
import { getLocale } from '#/server/common/helpers/i18n/get-locale.js'
import { withForwardedPrefix } from '#/server/common/helpers/proxy/forwarded-prefix.js'
import { getRegulatorDetails } from '#/server/routes/_shared/compliance/regulator.js'
import {
  csoConfirmAcceptPrnPath,
  csoPrnsPath
} from '#/server/routes/_shared/prns/prns-paths.js'
import { resolvePrnYear } from '#/server/routes/_shared/prns/resolve-prn-year.js'
import { isPrnStatusEditable } from '#/server/routes/_shared/prns/prn-status.js'
import {
  singleSchemePrn,
  prnRouteOptions
} from '#/server/routes/_shared/prns/prns-route-options.js'
import * as complianceMiddlewares from '#/server/routes/_shared/compliance/_middlewares/index.js'
import * as csoPrnMiddlewares from '#/server/routes/cso/_middlewares/index.js'
import { csoObligationsHomePath } from '#/server/routes/_shared/obligations/obligations-paths.js'
import { config } from '#/config/config.js'

export const prnSingleController = {
  method: 'GET',
  path: '/cso/{schemeId}/prns/{prnId}',
  options: {
    ...prnRouteOptions,
    pre: singleSchemePrn(
      complianceMiddlewares.organisation,
      csoPrnMiddlewares.prn
    )
  },
  async handler(request, h) {
    const { schemeId } = request.params
    const { prn } = request.pre
    const queryYear = request.query.year
    const year = resolvePrnYear(queryYear, prn)

    const regulator = getRegulatorDetails(
      request.pre?.organisation?.businessCountry,
      getLocale(request)
    )

    return h.view('_shared/prns/views/prn', {
      schemeId,
      organisationName: request.pre?.organisation?.name,
      year,
      prn,
      isStatusEditable: isPrnStatusEditable(prn),
      gotoPrnConfirmAccept: withForwardedPrefix(
        request,
        csoConfirmAcceptPrnPath(schemeId, request.params.prnId, queryYear)
      ),
      backLink: withForwardedPrefix(
        request,
        csoPrnsPath(schemeId, queryYear ?? year)
      ),
      acceptOrRejectMoreLink: withForwardedPrefix(
        request,
        csoPrnsPath(schemeId, year)
      ),
      showObligationsLink:
        Boolean(year) && config.get('features.manageObligations'),
      obligationsLink: withForwardedPrefix(
        request,
        csoObligationsHomePath(schemeId, year)
      ),
      regulatorName: regulator.nameWithArticle,
      regulatorEmail: regulator.email,
      regulation43Url: REGULATION_43_URL
    })
  }
}

export const prnRoutes = [prnSingleController]
