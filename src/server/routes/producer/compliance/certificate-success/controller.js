import { PUBLIC_REGISTER_URL } from '#/config/constants.js'
import { certificateViewUrl } from '../certificate-view/controller.js'
import * as middlewares from '#/server/routes/_shared/compliance/_middlewares/index.js'
import {
  producerCompliancePre,
  producerComplianceRouteOptions
} from '#/server/routes/_shared/compliance/compliance-route-options.js'
import {
  certificateSuccessParamsSchema,
  complianceDeclarationRouteQuerySchema
} from '#/server/routes/_shared/compliance/schemas.js'
import { producerCertificatePath } from '#/server/routes/_shared/compliance/compliance-paths.js'
import { appendLangQuery } from '#/server/common/helpers/i18n/locale-url.js'
import { getLocale } from '#/server/common/helpers/i18n/get-locale.js'
import { getRegulatorDetailsByName } from '#/server/routes/_shared/compliance/regulator.js'
import { withForwardedPrefix } from '#/server/common/helpers/proxy/forwarded-prefix.js'

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

function buildCertificateSuccessViewModel(declaration, userEmail, locale) {
  const regulator = getRegulatorDetailsByName(
    declaration.organisation.regulator,
    locale
  )

  return {
    year: declaration.obligationYear,
    userEmail,
    regulatorName: regulator.nameWithArticle,
    regulatorEmail: declaration.organisation.regulatorEmail
  }
}

export const certificateSuccessController = {
  method: 'GET',
  path: '/producer/{organisationId}/compliance/certificate/{complianceDeclarationId}/success',
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
    const locale = getLocale(request)
    const userEmail = request.yar.get('user')?.email ?? ''
    const viewModel = buildCertificateSuccessViewModel(
      declaration,
      userEmail,
      locale
    )

    return h.view('producer/compliance/certificate-success/index', {
      ...viewModel,
      organisationId,
      publicRegisterUrl: PUBLIC_REGISTER_URL,
      certificateViewHref: withForwardedPrefix(
        request,
        certificateViewUrl(organisationId, locale, declaration.id)
      )
    })
  }
}

export const certificateSuccessRoutes = [certificateSuccessController]
