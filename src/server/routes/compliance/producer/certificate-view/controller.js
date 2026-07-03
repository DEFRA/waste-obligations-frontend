import { getLocale } from '#/server/common/helpers/i18n/get-locale.js'
import { appendLangQuery } from '#/server/common/helpers/i18n/locale-url.js'
import * as middlewares from '#/server/routes/compliance/_middlewares/index.js'
import { producerCertificatePath } from '#/server/routes/compliance/_shared/compliance-paths.js'
import {
  producerComplianceViewPre,
  producerComplianceRouteOptions
} from '#/server/routes/compliance/_shared/compliance-route-options.js'
import {
  certificateViewParamsSchema,
  complianceDeclarationRouteQuerySchema
} from '#/server/routes/compliance/_shared/schemas.js'

import { buildCertificateViewModel } from './view-model.js'

export const certificateViewController = {
  method: 'GET',
  path: '/compliance/producer/{organisationId}/certificate/{complianceDeclarationId}',
  options: {
    ...producerComplianceRouteOptions,
    validate: {
      ...producerComplianceRouteOptions.validate,
      params: certificateViewParamsSchema,
      query: complianceDeclarationRouteQuerySchema
    },
    pre: producerComplianceViewPre(middlewares.complianceDeclaration)
  },
  async handler(request, h) {
    const { organisationId } = request.params
    const declaration = request.pre.complianceDeclaration
    const viewModel = buildCertificateViewModel({
      declaration,
      locale: getLocale(request)
    })

    return h.view('compliance/producer/certificate-view/index', {
      organisationId,
      ...viewModel
    })
  }
}

export function certificateViewUrl(
  organisationId,
  locale,
  complianceDeclarationId
) {
  return appendLangQuery(
    producerCertificatePath(organisationId, `/${complianceDeclarationId}`),
    locale
  )
}

export const certificateViewRoutes = [certificateViewController]
