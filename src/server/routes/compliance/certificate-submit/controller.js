import Boom from '@hapi/boom'
import Joi from 'joi'

import { getRegulatorDetails } from '../_shared/regulator.js'
import { presentObligationsForCertificateSubmit } from './obligation-presenter.js'
import * as middlewares from '../_middlewares/index.js'
import { complianceRouteOptions } from '../_shared/compliance-route-options.js'

/** Until submitter identity comes from authentication. */
const CACHE_KEY_PREFIX = 'compliance-certificate-submit'
const MOCK_USER_ID = '00000000-0000-4000-8000-000000000001'
const COMPLIANCE_DECLARATION_PLACEHOLDER_USER = Object.freeze({
  id: MOCK_USER_ID,
  email: 'unknown@not-set.local'
})
const DEFAULT_DECLARATION_TEXT =
  'I confirm that the organisation has met its producer responsibility obligations for the stated obligation year, to the best of my knowledge and belief.'

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
    const cachePayload = {
      organisation,
      organisationId,
      obligationYear: Number(year),
      obligations: request.pre.obligations?.obligations,
      obligationStatus: overallStatus
    }

    request.server.app.redisClient.set(
      `${CACHE_KEY_PREFIX}:${MOCK_USER_ID}:${organisationId}:${year}`,
      JSON.stringify(cachePayload)
    )

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
    pre: [
      {
        assign: 'certificatePayload',
        method: async (request) => {
          const { organisationId } = request.params
          const { year } = request.query
          const cacheKey = `${CACHE_KEY_PREFIX}:${MOCK_USER_ID}:${organisationId}:${year}`
          const raw = await request.server.app.redisClient.get(cacheKey)

          if (raw) {
            try {
              return JSON.parse(raw)
            } catch (error) {
              request.logger.error(
                { err: error, organisationId, year },
                `Failed to parse submit cache payload for ${year} year`
              )
            }
          }

          return null
        }
      }
    ],
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
    const traceId = request.app.traceId
    const { fullName } = request.payload
    const cacheKey = `${CACHE_KEY_PREFIX}:${MOCK_USER_ID}:${organisationId}:${year}`
    const certificatePayload = request.pre.certificatePayload

    if (!certificatePayload) {
      throw Boom.badRequest(
        `Unable to find submit cache payload for ${year} year`
      )
    }

    try {
      const { organisation, obligationYear, obligations, obligationStatus } =
        certificatePayload
      const payload = {
        organisation: {
          id: organisation?.id,
          name: organisation?.name ?? null,
          complianceSchemeName: organisation?.tradingName ?? null,
          schemeOperatorName: null,
          referenceNumber: organisation?.companiesHouseNumber ?? null,
          address: organisation?.address ?? null,
          regulator: null
        },
        obligationYear,
        obligations,
        obligationStatus,
        declarationText: { text: DEFAULT_DECLARATION_TEXT, language: 'en' },
        submitterName: fullName.trim(),
        user: COMPLIANCE_DECLARATION_PLACEHOLDER_USER
      }

      await request.server.app.wasteObligationsApi.createComplianceDeclaration(
        organisationId,
        payload,
        traceId
      )

      await request.server.app.redisClient.del(cacheKey)
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
