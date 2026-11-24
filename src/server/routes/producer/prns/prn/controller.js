import { REGULATION_43_URL } from '#/config/constants.js'
import { getLocale } from '#/server/common/helpers/i18n/get-locale.js'
import { resolveBackLinkHref } from '#/server/common/helpers/navigation/back-link.js'
import { withForwardedPrefix } from '#/server/common/helpers/proxy/forwarded-prefix.js'
import { getRegulatorDetails } from '#/server/routes/_shared/compliance/regulator.js'
import {
  producerChooseYearPrnPath,
  producerConfirmAcceptPrnPath,
  producerConfirmRejectPrnPath,
  producerPrnsPath
} from '#/server/routes/_shared/prns/prns-paths.js'
import { resolvePrnYear } from '#/server/routes/_shared/prns/resolve-prn-year.js'
import { digitsAsWords } from '#/server/routes/_shared/prns/digits-as-words.js'
import { isPrnStatusEditable } from '#/server/routes/_shared/prns/prn-status.js'
import {
  buildDecemberWasteFlash,
  hasAcceptanceYearChoice
} from '#/server/routes/_shared/prns/available-acceptance-years.js'
import { now } from '#/server/common/helpers/clock.js'
import {
  singlePrn,
  prnRouteOptions
} from '#/server/routes/_shared/prns/prns-route-options.js'
import * as complianceMiddlewares from '#/server/routes/_shared/compliance/_middlewares/index.js'
import * as producerPrnMiddlewares from '#/server/routes/producer/_middlewares/index.js'
import {
  producerObligationsChooseYearPath,
  producerObligationsHomePath
} from '#/server/routes/_shared/obligations/obligations-paths.js'
import { config } from '#/config/config.js'

export const prnSingleController = {
  method: 'GET',
  path: '/producer/{organisationId}/prns/{prnId}',
  options: {
    ...prnRouteOptions,
    pre: singlePrn(
      complianceMiddlewares.organisation,
      producerPrnMiddlewares.prn
    )
  },
  async handler(request, h) {
    const { organisationId } = request.params
    const { prn } = request.pre
    const queryYear = request.query.year
    const year = resolvePrnYear(queryYear, prn)
    const isRejectionConfirmation =
      request.query?.confirmed === '1' && prn?.status === 'Rejected'
    // Straight after a rejection the obligations button opens the year the
    // user was managing, which differs from the note's own year for a
    // December Waste note rejected while managing the next year.
    const obligationsYear = isRejectionConfirmation ? (queryYear ?? year) : year
    const locale = getLocale(request)

    const regulator = getRegulatorDetails(
      request.pre?.organisation?.businessCountry,
      locale
    )

    return h.view('_shared/prns/views/prn', {
      organisationId,
      organisationName: request.pre?.organisation?.name,
      year,
      prn,
      isStatusEditable: isPrnStatusEditable(prn),
      isAcceptanceConfirmation:
        request.query?.confirmed === '1' && prn?.status === 'Accepted',
      isRejectionConfirmation,
      tonnageInWords: digitsAsWords(prn?.tonnage),
      decemberWasteFlash: buildDecemberWasteFlash(prn, locale, { now: now() }),
      gotoPrnConfirmAccept: withForwardedPrefix(
        request,
        (hasAcceptanceYearChoice(prn, { now: now() })
          ? producerChooseYearPrnPath
          : producerConfirmAcceptPrnPath)(
          organisationId,
          request.params.prnId,
          queryYear
        )
      ),
      gotoPrnConfirmReject: withForwardedPrefix(
        request,
        producerConfirmRejectPrnPath(
          organisationId,
          request.params.prnId,
          queryYear
        )
      ),
      // Prefer wherever the user actually came from (eg the check-selection
      // review page), falling back to the PRNs list only when there's no
      // usable navigation history.
      backLink: resolveBackLinkHref(request, {
        fallbackUrl: producerPrnsPath(organisationId, queryYear ?? year)
      }),
      acceptOrRejectMoreLink: withForwardedPrefix(
        request,
        producerPrnsPath(organisationId, year)
      ),
      obligationsYear,
      showObligationsLink:
        Boolean(obligationsYear) && config.get('features.manageObligations'),
      // With no year (a rejected PRN has none) the obligations button opens
      // the Choose a year page.
      obligationsLink: withForwardedPrefix(
        request,
        obligationsYear
          ? producerObligationsHomePath(organisationId, obligationsYear)
          : producerObligationsChooseYearPath(organisationId)
      ),
      obligationsLinkOnCdp: config.get('features.manageObligations'),
      regulatorName: regulator.nameWithArticle,
      regulatorEmail: regulator.email,
      regulation43Url: REGULATION_43_URL
    })
  }
}

export const prnRoutes = [prnSingleController]
