import Boom from '@hapi/boom'
import Joi from 'joi'

import { getRegulatorDetails } from '../_shared/regulator.js'
import { presentObligationsForCertificateSubmit } from './obligation-presenter.js'
import * as middlewares from '../_middlewares/index.js'
import {
  compliancePre,
  complianceRouteOptions
} from '../_shared/compliance-route-options.js'
import { CERTIFICATE_SUBMIT_DECLARATION_API_TEXT_KEY } from '#/server/auth/constants.js'
import { getLocale } from '#/server/common/helpers/i18n/get-locale.js'
import { appendLangQuery } from '#/server/common/helpers/i18n/locale-url.js'
import { translate } from '#/server/common/helpers/i18n/translate.js'

const FULL_NAME_MAX_LENGTH = 200

function formatOrganisationAddress(address) {
  if (address == null) {
    return ''
  }

  if (typeof address !== 'object') {
    return String(address).trim()
  }

  return [
    address.addressLine1,
    address.addressLine2,
    address.town,
    address.county,
    address.postcode,
    address.country
  ]
    .filter(Boolean)
    .map((p) => p.toString().trim())
    .filter(Boolean)
    .join(', ')
}

function formatOrganisationName(organisation, year) {
  if (organisation == null || typeof organisation !== 'object') {
    return ''
  }

  const registrations = organisation.registrations ?? []
  const matchingRegistrations = registrations
    .filter((x) => x.registrationYear === Number(year))
    .sort((a, b) => new Date(b.updated) - new Date(a.updated))
  const registration =
    matchingRegistrations.find((x) => x.status === 'REGISTERED') ??
    matchingRegistrations[0]

  if (!registration) {
    throw new Error(`No registration found, using year ${year}`)
  }

  const result = (() => {
    switch (registration.type) {
      case 'LARGE_PRODUCER':
        return organisation.name

      case 'COMPLIANCE_SCHEME':
        return organisation.tradingName

      default:
        return organisation.name
    }
  })()

  return result ?? organisation.name
}

export function buildCertificateSubmitCacheKey(userId, organisationId, year) {
  return `compliance-certificate-submit:${userId}:${organisationId}:${year}`
}

export const certificateSubmitController = {
  method: 'GET',
  path: '/compliance/{organisationId}/certificate/submit',
  options: {
    ...complianceRouteOptions,
    pre: compliancePre(
      middlewares.organisation,
      middlewares.declarations,
      middlewares.obligations
    )
  },
  async handler(request, h) {
    const { organisationId } = request.params
    const { year } = request.query
    const hasSubmittedDeclaration = request.pre.declarations?.find(
      (d) => d.status === 'Submitted'
    )

    if (hasSubmittedDeclaration) {
      return h.redirect(
        appendLangQuery(
          `/compliance/${organisationId}/certificate/success?year=${year}`,
          getLocale(request)
        )
      )
    }

    const organisation = request.pre?.organisation
    const regulator = getRegulatorDetails(organisation?.businessCountry)
    const { overallStatus, obligationsRows, glassRows } =
      presentObligationsForCertificateSubmit(request.pre.obligations)

    const cacheEntity = {
      organisation,
      organisationId,
      obligationYear: Number(year),
      obligations: request.pre.obligations,
      obligationStatus: overallStatus,
      regulatorName: regulator.name,
      regulatorEmail: regulator.email
    }

    await request.server.app.redisClient.set(
      buildCertificateSubmitCacheKey(
        request.yar.get('user').id,
        organisationId,
        year
      ),
      JSON.stringify(cacheEntity)
    )

    return h.view('compliance/certificate-submit/index', {
      organisationId,
      year,
      regulatorName: regulator.name,
      regulatorEmail: regulator.email,
      overallStatus,
      obligationsRows,
      glassRows,
      organisationName: formatOrganisationName(organisation, year),
      organisationAddress: formatOrganisationAddress(organisation?.address)
    })
  }
}

export const certificateSubmitPostController = {
  method: 'POST',
  path: '/compliance/{organisationId}/certificate/submit',
  options: {
    ...complianceRouteOptions,
    pre: compliancePre({
      assign: 'cachedPayload',
      method: async (request) => {
        const { organisationId } = request.params
        const { year } = request.query
        const cacheKey = buildCertificateSubmitCacheKey(
          request.yar.get('user').id,
          organisationId,
          year
        )
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
    }),
    validate: {
      ...complianceRouteOptions.validate,
      payload: Joi.object({
        fullName: Joi.string()
          .trim()
          .min(1)
          .max(FULL_NAME_MAX_LENGTH)
          .required()
      })
    }
  },
  async handler(request, h) {
    const { organisationId } = request.params
    const { year } = request.query
    const traceId = request.app.traceId
    const { fullName } = request.payload
    const user = request.yar.get('user')
    const cacheKey = buildCertificateSubmitCacheKey(
      user.id,
      organisationId,
      year
    )
    const cachedPayload = request.pre.cachedPayload

    if (!cachedPayload) {
      throw Boom.badRequest(
        `Unable to find submit cache payload for ${year} year`
      )
    }

    try {
      const locale = getLocale(request)
      const {
        organisation,
        obligationYear,
        obligations,
        obligationStatus,
        regulatorName,
        regulatorEmail
      } = cachedPayload
      const payload = {
        organisation: {
          id: organisation.id,
          name: formatOrganisationName(organisation, obligationYear),
          // TODO: user service will provide organisationNumber
          referenceNumber: organisation.companiesHouseNumber,
          address: organisation.address,
          complianceSchemeName: null,
          schemeOperatorName: null,
          regulator: regulatorName,
          regulatorEmail
        },
        obligations,
        obligationYear,
        obligationStatus,
        declarationText: {
          text: translate(locale, CERTIFICATE_SUBMIT_DECLARATION_API_TEXT_KEY),
          language: locale
        },
        submitterName: fullName.trim(),
        user: {
          id: user.id,
          email: user.email
        }
      }

      await request.server.app.wasteObligationsApi.createComplianceDeclaration(
        organisationId,
        payload,
        traceId
      )
      await request.server.app.redisClient.del(cacheKey)

      return h.redirect(
        appendLangQuery(
          `/compliance/${organisationId}/certificate/success?year=${year}`,
          locale
        )
      )
    } catch (error) {
      request.logger.error(
        { err: error, organisationId, year },
        'Failed to create compliance declaration'
      )
      throw Boom.badGateway('Unable to submit certificate of compliance')
    }
  }
}

export const certificateSubmitRoutes = [
  certificateSubmitController,
  certificateSubmitPostController
]
