import { REGULATION_43_URL } from '#/config/constants.js'
import { getLocale } from '#/server/common/helpers/i18n/get-locale.js'
import { resolveBackLinkHref } from '#/server/common/helpers/navigation/back-link.js'
import { withForwardedPrefix } from '#/server/common/helpers/proxy/forwarded-prefix.js'
import { getRegulatorDetails } from '#/server/routes/_shared/compliance/regulator.js'
import {
  csoChooseYearPrnPath,
  csoConfirmAcceptPrnPath,
  csoConfirmRejectPrnPath,
  csoPrnsPath
} from '#/server/routes/_shared/prns/prns-paths.js'
import { hasAcceptanceYearChoice } from '#/server/routes/_shared/prns/available-acceptance-years.js'
import { resolvePrnYear } from '#/server/routes/_shared/prns/resolve-prn-year.js'
import { digitsAsWords } from '#/server/routes/_shared/prns/digits-as-words.js'
import { isPrnStatusEditable } from '#/server/routes/_shared/prns/prn-status.js'
import { buildDecemberWasteFlash } from '#/server/routes/_shared/prns/available-acceptance-years.js'
import { now } from '#/server/common/helpers/clock.js'
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
    const locale = getLocale(request)

    const regulator = getRegulatorDetails(
      request.pre?.organisation?.businessCountry,
      locale
    )

    return h.view('_shared/prns/views/prn', {
      schemeId,
      organisationName: request.pre?.organisation?.name,
      year,
      prn,
      isStatusEditable: isPrnStatusEditable(prn),
      isAcceptanceConfirmation:
        request.query?.confirmed === '1' && prn?.status === 'Accepted',
      isRejectionConfirmation:
        request.query?.confirmed === '1' && prn?.status === 'Rejected',
      tonnageInWords: digitsAsWords(prn?.tonnage),
      decemberWasteFlash: buildDecemberWasteFlash(prn, locale, { now: now() }),
      gotoPrnConfirmAccept: withForwardedPrefix(
        request,
        (hasAcceptanceYearChoice(prn)
          ? csoChooseYearPrnPath
          : csoConfirmAcceptPrnPath)(schemeId, request.params.prnId, queryYear)
      ),
      gotoPrnConfirmReject: withForwardedPrefix(
        request,
        csoConfirmRejectPrnPath(schemeId, request.params.prnId, queryYear)
      ),
      // Prefer wherever the user actually came from (eg the check-selection
      // review page), falling back to the PRNs list only when there's no
      // usable navigation history.
      backLink: resolveBackLinkHref(request, {
        fallbackUrl: csoPrnsPath(schemeId, queryYear ?? year)
      }),
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
