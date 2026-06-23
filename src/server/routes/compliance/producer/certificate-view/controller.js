import { buildCertificateViewModel } from './view-model.js'
import * as middlewares from '../../_middlewares/index.js'
import {
  producerCompliancePre,
  producerComplianceRouteOptions
} from '../../_shared/compliance-route-options.js'
import {
  certificateViewParamsSchema,
  complianceDeclarationRouteQuerySchema
} from '../../_shared/schemas.js'
import { producerCertificatePath } from '../../_shared/compliance-paths.js'
import { appendLangQuery } from '#/server/common/helpers/i18n/locale-url.js'

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
    pre: producerCompliancePre(middlewares.complianceDeclaration)
  },
  async handler(request, h) {
    const { organisationId } = request.params
    const declaration = request.pre.complianceDeclaration
    const user = request.yar.get('user')
    const viewModel = buildCertificateViewModel({ declaration, user })

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
