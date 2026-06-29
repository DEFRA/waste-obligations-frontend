import { PUBLIC_REGISTER_URL } from '#/config/constants.js'
import { certificateViewUrl } from '../certificate-view/controller.js'
import * as middlewares from '../../_middlewares/index.js'
import {
  producerCompliancePre,
  producerComplianceRouteOptions
} from '../../_shared/compliance-route-options.js'
import {
  certificateSuccessParamsSchema,
  complianceDeclarationRouteQuerySchema
} from '../../_shared/schemas.js'
import { producerCertificatePath } from '../../_shared/compliance-paths.js'
import { appendLangQuery } from '#/server/common/helpers/i18n/locale-url.js'
import { getLocale } from '#/server/common/helpers/i18n/get-locale.js'

export function certificateSuccessUrl(
  organisationId,
  locale,
  complianceDeclarationId
) {
  return appendLangQuery(
    producerCertificatePath(
      organisationId,
      `/${complianceDeclarationId}/success`
    ),
    locale
  )
}

function buildCertificateSuccessViewModel(declaration) {
  return {
    year: declaration.obligationYear,
    regulatorName: declaration.organisation.regulator,
    regulatorEmail: declaration.organisation.regulatorEmail
  }
}

export const certificateSuccessController = {
  method: 'GET',
  path: '/compliance/producer/{organisationId}/certificate/{complianceDeclarationId}/success',
  options: {
    ...producerComplianceRouteOptions,
    validate: {
      ...producerComplianceRouteOptions.validate,
      params: certificateSuccessParamsSchema,
      query: complianceDeclarationRouteQuerySchema
    },
    pre: producerCompliancePre(middlewares.complianceDeclaration)
  },
  async handler(request, h) {
    const { organisationId } = request.params
    const declaration = request.pre.complianceDeclaration

    const { year, regulatorName, regulatorEmail } =
      buildCertificateSuccessViewModel(declaration)

    return h.view('compliance/producer/certificate-success/index', {
      organisationId,
      year,
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
