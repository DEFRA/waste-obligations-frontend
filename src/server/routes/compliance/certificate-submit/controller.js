import Boom from '@hapi/boom'
import Joi from 'joi'

import { getRegulatorDetails } from '../_shared/regulator.js'
import {
  buildCreateComplianceDeclarationPayload,
  presentObligationsForCertificateSubmit,
  toComplianceDeclarationObligationStatus
} from './obligation-presenter.js'
import * as middlewares from '../_middlewares/index.js'
import { complianceRouteOptions } from '../_shared/compliance-route-options.js'

/** Until submitter identity comes from authentication. */
const COMPLIANCE_DECLARATION_PLACEHOLDER_USER = Object.freeze({
  id: '00000000-0000-4000-8000-000000000001',
  email: 'unknown@not-set.local'
})

function formatOrganisationAddress(address) {
  return [
    address?.addressLine1,
    address?.addressLine2,
    address?.town,
    address?.county,
    address?.postcode,
    address?.country
  ]
    .filter(Boolean)
    .map((p) => p.toString().trim())
    .filter(Boolean)
    .join(', ')
}

export const certificateSubmitController = {
  method: 'GET',
  path: '/compliance/{organisationId}/certificate/submit',
  options: {
    ...complianceRouteOptions,
    pre: [middlewares.organisation, middlewares.obligations]
  },
  async handler(request, h) {
    const { organisationId } = request.params
    const { year } = request.query
    const organisation = request.pre?.organisation
    const regulator = getRegulatorDetails(organisation?.businessCountry)
    const { overallStatus, obligationsRows, glassRows } =
      presentObligationsForCertificateSubmit(request.pre.obligations)

    return h.view('compliance/certificate-submit/index', {
      organisationId,
      year,
      regulatorName: regulator.name,
      regulatorEmail: regulator.email,
      overallStatus,
      obligationsRows,
      glassRows,
      organisationName: organisation?.tradingName ?? organisation?.name,
      organisationIdentifier: organisationId,
      organisationAddress: formatOrganisationAddress(organisation?.address),
      breadcrumbs: [{ text: 'Home', href: '/' }, { text: 'Compliance' }]
    })
  }
}

export const certificateSubmitPostController = {
  method: 'POST',
  path: '/compliance/{organisationId}/certificate/submit',
  options: {
    ...complianceRouteOptions,
    pre: [middlewares.organisation, middlewares.obligations],
    validate: {
      ...complianceRouteOptions.validate,
      payload: Joi.object({
        fullName: Joi.string().trim().min(1).max(200).required()
      })
    }
  },
  async handler(request, h) {
    const { organisationId } = request.params
    const { year } = request.query
    const organisation = request.pre?.organisation
    const traceId = request.app.traceId
    const { fullName } = request.payload

    const { overallStatus } = presentObligationsForCertificateSubmit(
      request.pre.obligations
    )

    const payload = buildCreateComplianceDeclarationPayload({
      organisation,
      organisationId,
      obligationYear: Number(year),
      obligations: request.pre.obligations?.obligations ?? [],
      obligationStatus: toComplianceDeclarationObligationStatus(overallStatus),
      fullName,
      user: COMPLIANCE_DECLARATION_PLACEHOLDER_USER
    })

    try {
      await request.server.app.wasteObligationsApi.createComplianceDeclaration(
        organisationId,
        payload,
        traceId
      )
    } catch (error) {
      request.logger.error(
        { err: error, organisationId, year },
        'Failed to create compliance declaration'
      )
      throw Boom.badGateway('Unable to submit certificate of compliance')
    }

    return h.redirect(
      `/compliance/${organisationId}/certificate/success?year=${encodeURIComponent(
        year
      )}`
    )
  }
}

export const certificateSubmitRoutes = [
  certificateSubmitController,
  certificateSubmitPostController
]
