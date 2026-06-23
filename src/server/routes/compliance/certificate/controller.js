import { getRegulatorDetails } from '../_shared/regulator.js'
import { pickLatestSubmittedDeclarationForYear } from '../_shared/compliance-declaration.js'
import {
  compliancePre,
  complianceRouteOptions
} from '../_shared/compliance-route-options.js'
import * as middlewares from '../_middlewares/index.js'

export const certificateController = {
  method: 'GET',
  path: '/compliance/{organisationId}/certificate',
  options: {
    ...complianceRouteOptions,
    pre: compliancePre(middlewares.organisation, middlewares.declarations)
  },
  async handler(request, h) {
    const { organisationId } = request.params
    const { year } = request.query
    const submittedDeclaration = pickLatestSubmittedDeclarationForYear(
      request.pre.declarations,
      year
    )
    const { name: regulatorName, email: regulatorEmail } = getRegulatorDetails(
      request.pre.organisation?.businessCountry
    )

    return h.view('compliance/certificate/index', {
      organisationId,
      year,
      regulatorName,
      regulatorEmail,
      showContinueToSubmit: submittedDeclaration == null,
      submittedComplianceDeclarationId: submittedDeclaration?.id
    })
  }
}

export const certificateRoutes = [certificateController]
