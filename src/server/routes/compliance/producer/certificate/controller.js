import { getLocale } from '#/server/common/helpers/i18n/get-locale.js'
import { withForwardedPrefix } from '#/server/common/helpers/proxy/forwarded-prefix.js'
import { getRegulatorDetails } from '../../_shared/regulator.js'
import { pickLatestSubmittedDeclarationForYear } from '../../_shared/compliance-declaration.js'
import {
  producerCompliancePre,
  producerComplianceRouteOptions
} from '../../_shared/compliance-route-options.js'
import * as middlewares from '../../_middlewares/index.js'

export const certificateController = {
  method: 'GET',
  path: '/compliance/producer/{organisationId}/certificate',
  options: {
    ...producerComplianceRouteOptions,
    pre: producerCompliancePre(
      middlewares.organisation,
      middlewares.declarations
    )
  },
  async handler(request, h) {
    const { organisationId } = request.params
    const { year } = request.query
    const submittedDeclaration = pickLatestSubmittedDeclarationForYear(
      request.pre.declarations,
      year
    )
    const regulator = getRegulatorDetails(
      request.pre.organisation?.businessCountry,
      getLocale(request)
    )

    return h.view('compliance/producer/certificate/index', {
      organisationId,
      year,
      regulatorName: regulator.nameWithArticle,
      regulatorEmail: regulator.email,
      showContinueToSubmit: submittedDeclaration == null,
      submittedComplianceDeclarationId: submittedDeclaration?.id,
      submitHref: withForwardedPrefix(
        request,
        `/compliance/producer/${organisationId}/certificate/submit?year=${year}`
      )
    })
  }
}

export const certificateRoutes = [certificateController]
