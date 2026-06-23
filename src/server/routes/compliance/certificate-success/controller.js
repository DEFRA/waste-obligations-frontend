import { obligationStatusI18nKey } from '../certificate-submit/obligation-presenter.js'
import { PUBLIC_REGISTER_URL } from '#/config/constants.js'
import { certificateViewUrl } from '../certificate-view/controller.js'
import * as middlewares from '../_middlewares/index.js'
import {
  compliancePre,
  complianceRouteOptions
} from '../_shared/compliance-route-options.js'
import {
  certificateSuccessParamsSchema,
  complianceDeclarationRouteQuerySchema
} from '../_shared/schemas.js'
import { appendLangQuery } from '#/server/common/helpers/i18n/locale-url.js'
import { getLocale } from '#/server/common/helpers/i18n/get-locale.js'

export function certificateSuccessUrl(
  organisationId,
  locale,
  complianceDeclarationId
) {
  return appendLangQuery(
    `/compliance/${organisationId}/certificate/${complianceDeclarationId}/success`,
    locale
  )
}

function buildCertificateSuccessViewModel(declaration) {
  return {
    year: declaration.obligationYear,
    obligationStatusKey: obligationStatusI18nKey(declaration.obligationStatus),
    regulatorName: declaration.organisation.regulator,
    regulatorEmail: declaration.organisation.regulatorEmail
  }
}

export const certificateSuccessController = {
  method: 'GET',
  path: '/compliance/{organisationId}/certificate/{complianceDeclarationId}/success',
  options: {
    ...complianceRouteOptions,
    validate: {
      ...complianceRouteOptions.validate,
      params: certificateSuccessParamsSchema,
      query: complianceDeclarationRouteQuerySchema
    },
    pre: compliancePre(middlewares.complianceDeclaration)
  },
  async handler(request, h) {
    const { organisationId } = request.params
    const declaration = request.pre.complianceDeclaration

    const { year, obligationStatusKey, regulatorName, regulatorEmail } =
      buildCertificateSuccessViewModel(declaration)

    return h.view('compliance/certificate-success/index', {
      organisationId,
      year,
      obligationStatusKey,
      regulatorName,
      regulatorEmail,
      publicRegisterUrl: PUBLIC_REGISTER_URL,
      certificateViewHref: certificateViewUrl(
        organisationId,
        getLocale(request),
        declaration.id
      )
    })
  }
}

export const certificateSuccessRoutes = [certificateSuccessController]
