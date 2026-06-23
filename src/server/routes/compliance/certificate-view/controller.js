import { buildCertificateViewModel } from './view-model.js'
import * as middlewares from '../_middlewares/index.js'
import {
  compliancePre,
  complianceRouteOptions
} from '../_shared/compliance-route-options.js'
import {
  certificateViewParamsSchema,
  complianceDeclarationRouteQuerySchema
} from '../_shared/schemas.js'
import { appendLangQuery } from '#/server/common/helpers/i18n/locale-url.js'

export const certificateViewController = {
  method: 'GET',
  path: '/compliance/{organisationId}/certificate/{complianceDeclarationId}',
  options: {
    ...complianceRouteOptions,
    validate: {
      ...complianceRouteOptions.validate,
      params: certificateViewParamsSchema,
      query: complianceDeclarationRouteQuerySchema
    },
    pre: compliancePre(middlewares.complianceDeclaration)
  },
  async handler(request, h) {
    const { organisationId } = request.params
    const declaration = request.pre.complianceDeclaration
    const user = request.yar.get('user')
    const viewModel = buildCertificateViewModel({ declaration, user })

    return h.view('compliance/certificate-view/index', {
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
    `/compliance/${organisationId}/certificate/${complianceDeclarationId}`,
    locale
  )
}

export const certificateViewRoutes = [certificateViewController]
