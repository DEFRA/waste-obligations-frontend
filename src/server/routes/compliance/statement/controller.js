import { getObligationYear } from '../_shared/year.js'
import { getRegulatorEmail } from '../_shared/regulator-email.js'
import { createWasteOrganisationsApiService } from '#/server/services/waste-organisations-api.service.js'
import { createLogger } from '#/server/common/helpers/logging/logger.js'

const wasteOrganisationsApiService = createWasteOrganisationsApiService()
const logger = createLogger()

export const statementController = {
  async handler(request, h) {
    const year = getObligationYear(request)
    const { organisationId } = request.params
    let regulatorEmail = getRegulatorEmail()

    try {
      const organisation =
        await wasteOrganisationsApiService.getOrganisation(organisationId)
      regulatorEmail = getRegulatorEmail(organisation?.businessCountry)
    } catch (error) {
      logger.warn(
        { err: error, organisationId },
        'Failed to load organisation details, using default regulator email'
      )
    }

    return h.view('compliance/statement/index', {
      pageTitle: 'About your statement of compliance',
      heading: 'About your statement of compliance',
      organisationId,
      year,
      regulatorEmail,
      breadcrumbs: [{ text: 'Home', href: '/' }, { text: 'Compliance' }]
    })
  }
}
