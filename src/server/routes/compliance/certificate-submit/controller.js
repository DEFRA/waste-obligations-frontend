import Boom from '@hapi/boom'

import { RedisCacheValidationError } from '#/server/common/helpers/validate-redis-cache.js'
import { getRegulatorDetails } from '../_shared/regulator.js'
import { certificateSubmitPostPayloadSchema } from './schemas.js'
import {
  buildCertificateSubmitCacheKey,
  buildCertificateSubmitDeclarationText,
  formatCertificateSubmitDeclarationApiText,
  formatOrganisationAddress,
  formatOrganisationName,
  readCertificateSubmitCacheRaw,
  writeCertificateSubmitCache
} from './utils.js'
import { presentObligationsForCertificateSubmit } from './obligation-presenter.js'
import * as middlewares from '../_middlewares/index.js'
import {
  compliancePre,
  complianceRouteOptions
} from '../_shared/compliance-route-options.js'
import { getLocale } from '#/server/common/helpers/i18n/get-locale.js'
import { appendLangQuery } from '#/server/common/helpers/i18n/locale-url.js'

function buildComplianceDeclarationApiPayload({
  cachedPayload,
  user,
  fullName,
  organisationNumber
}) {
  const {
    organisation,
    obligationYear,
    obligations,
    obligationStatus,
    regulatorName,
    regulatorEmail,
    declarationText
  } = cachedPayload

  return {
    organisation: {
      id: organisation.id,
      name: formatOrganisationName(organisation, obligationYear),
      referenceNumber: organisationNumber,
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
      text: formatCertificateSubmitDeclarationApiText(declarationText),
      language: declarationText.language
    },
    submitterName: fullName.trim(),
    user: {
      id: user.id,
      email: user.email
    }
  }
}

async function createComplianceDeclarationAndClearCache(
  request,
  organisationId,
  cacheKey,
  payload
) {
  await request.server.app.wasteObligationsApi.createComplianceDeclaration(
    organisationId,
    payload
  )
  await request.server.app.redisClient.del(cacheKey)
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
    const locale = getLocale(request)
    const organisationName = formatOrganisationName(organisation, year)
    const declarationText = buildCertificateSubmitDeclarationText(
      locale,
      organisationName
    )
    const user = request.yar.get('user')
    const fullName = `${user.firstName} ${user.lastName}`

    const cacheEntity = {
      organisation,
      organisationId,
      obligationYear: Number(year),
      obligations: request.pre.obligations,
      obligationStatus: overallStatus,
      regulatorName: regulator.name,
      regulatorEmail: regulator.email,
      declarationText
    }

    try {
      await writeCertificateSubmitCache(
        request.server.app.redisClient,
        buildCertificateSubmitCacheKey(
          request.yar.get('user').id,
          organisationId,
          year
        ),
        cacheEntity
      )
    } catch (error) {
      request.logger.error(
        {
          err: error,
          event: {
            action: 'write-certificate-submit-cache',
            category: 'compliance',
            outcome: 'failure'
          },
          tenant: { message: `organisationId=${organisationId}, year=${year}` }
        },
        'Failed to write certificate submit cache'
      )
      throw Boom.badGateway('Unable to prepare certificate of compliance')
    }

    return h.view('compliance/certificate-submit/index', {
      year,
      regulatorName: regulator.name,
      regulatorEmail: regulator.email,
      overallStatus,
      obligationsRows,
      glassRows,
      organisationName,
      organisationNumber: request.pre.currentOrganisation.organisationNumber,
      organisationAddress: formatOrganisationAddress(organisation?.address),
      declarationText,
      fullName
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

        try {
          return await readCertificateSubmitCacheRaw(
            request.server.app.redisClient,
            cacheKey
          )
        } catch (error) {
          const message =
            error instanceof RedisCacheValidationError
              ? 'Submit cache payload failed validation'
              : `Failed to parse submit cache payload for ${year} year`

          request.logger.error(
            {
              err: error,
              event: {
                action: 'read-certificate-submit-cache',
                category: 'compliance',
                outcome: 'failure'
              },
              tenant: {
                message: `organisationId=${organisationId}, year=${year}`
              }
            },
            message
          )
        }

        return null
      }
    }),
    validate: {
      ...complianceRouteOptions.validate,
      payload: certificateSubmitPostPayloadSchema
    }
  },
  async handler(request, h) {
    const { organisationId } = request.params
    const { year } = request.query
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
      const payload = buildComplianceDeclarationApiPayload({
        cachedPayload,
        user,
        fullName,
        organisationNumber: request.pre.currentOrganisation.organisationNumber
      })

      await createComplianceDeclarationAndClearCache(
        request,
        organisationId,
        cacheKey,
        payload
      )

      return h.redirect(
        appendLangQuery(
          `/compliance/${organisationId}/certificate/success?year=${year}`,
          cachedPayload.declarationText.language
        )
      )
    } catch (error) {
      request.logger.error(
        {
          err: error,
          event: {
            action: 'create-compliance-declaration',
            category: 'compliance',
            outcome: 'failure'
          },
          tenant: { message: `organisationId=${organisationId}, year=${year}` }
        },
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
