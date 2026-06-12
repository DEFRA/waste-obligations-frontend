import Boom from '@hapi/boom'

import { buildCertificateViewModel } from './view-model.js'
import * as middlewares from '../_middlewares/index.js'
import {
  compliancePre,
  complianceRouteOptions
} from '../_shared/compliance-route-options.js'
import { appendLangQuery } from '#/server/common/helpers/i18n/locale-url.js'

export const certificateViewController = {
  method: 'GET',
  path: '/compliance/{organisationId}/certificate/view',
  options: {
    ...complianceRouteOptions,
    pre: compliancePre(middlewares.organisation, middlewares.declarations)
  },
  async handler(request, h) {
    const { organisationId } = request.params
    const { year } = request.query
    const user = request.yar.get('user')
    const viewModel = buildCertificateViewModel({
      declarations: request.pre.declarations,
      organisation: request.pre.organisation,
      currentOrganisation: request.pre.currentOrganisation,
      user,
      year
    })

    if (!viewModel) {
      throw Boom.notFound()
    }

    return h.view('compliance/certificate-view/index', {
      organisationId,
      ...viewModel
    })
  }
}

export function certificateViewUrl(organisationId, year, locale) {
  return appendLangQuery(
    `/compliance/${organisationId}/certificate/view?year=${year}`,
    locale
  )
}

export const certificateViewRoutes = [certificateViewController]
