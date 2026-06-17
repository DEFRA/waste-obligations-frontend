import {
  obligationStatusI18nKey,
  presentObligationsForCertificateSubmit
} from '../certificate-submit/obligation-presenter.js'
import { pickLatestDeclarationForYear } from '../_shared/compliance-declaration.js'
import { getRegulatorDetails } from '../_shared/regulator.js'
import { PUBLIC_REGISTER_URL } from '#/config/constants.js'
import { certificateViewUrl } from '../certificate-view/controller.js'
import * as middlewares from '../_middlewares/index.js'
import {
  compliancePre,
  complianceRouteOptions
} from '../_shared/compliance-route-options.js'
import { appendLangQuery } from '#/server/common/helpers/i18n/locale-url.js'
import { getLocale } from '#/server/common/helpers/i18n/get-locale.js'

export function certificateSuccessUrl(organisationId, year, locale) {
  return appendLangQuery(
    `/compliance/${organisationId}/certificate/success?year=${year}`,
    locale
  )
}

function buildCertificateSuccessViewModel(pre, year) {
  const latest = pickLatestDeclarationForYear(pre?.declarations, year)
  if (latest) {
    return {
      obligationStatusKey: obligationStatusI18nKey(latest.obligationStatus)
    }
  }

  const { overallStatus } = presentObligationsForCertificateSubmit(
    pre.obligations
  )

  return {
    obligationStatusKey: obligationStatusI18nKey(overallStatus)
  }
}

export const certificateSuccessController = {
  method: 'GET',
  path: '/compliance/{organisationId}/certificate/success',
  options: {
    ...complianceRouteOptions,
    pre: compliancePre(
      middlewares.organisation,
      middlewares.declarations,
      middlewares.obligations
    )
  },
  async handler(request, h) {
    const { year } = request.query
    const { organisationId } = request.params
    const { obligationStatusKey } = buildCertificateSuccessViewModel(
      request.pre,
      request.query.year
    )
    const regulator = getRegulatorDetails(
      request.pre?.organisation?.businessCountry
    )

    return h.view('compliance/certificate-success/index', {
      organisationId,
      year,
      obligationStatusKey,
      regulatorName: regulator.name,
      regulatorEmail: regulator.email,
      publicRegisterUrl: PUBLIC_REGISTER_URL,
      certificateViewHref: certificateViewUrl(
        organisationId,
        year,
        getLocale(request)
      )
    })
  }
}

export const certificateSuccessRoutes = [certificateSuccessController]
