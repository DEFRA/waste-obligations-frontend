import Boom from '@hapi/boom'

import { getLocale } from '#/server/common/helpers/i18n/get-locale.js'
import { RedisCacheValidationError } from '#/server/common/helpers/validate-redis-cache.js'
import * as middlewares from '#/server/routes/compliance/_middlewares/index.js'
import { pickLatestSubmittedDeclarationForYear } from '#/server/routes/compliance/_shared/compliance-declaration.js'
import {
  producerCompliancePre,
  producerComplianceRouteOptions
} from '#/server/routes/compliance/_shared/compliance-route-options.js'
import { getFullNameFormErrors } from '#/server/routes/compliance/_shared/full-name-validation.js'
import { formatNameOnAccount } from '#/server/routes/compliance/_shared/name-on-account.js'
import { getRegulatorDetails } from '#/server/routes/compliance/_shared/regulator.js'
import {
  COMPLIANCE_SUBMIT_TYPES,
  handleComplianceSubmitFailure
} from '#/server/routes/compliance/_shared/submit-error.js'

import { presentObligationsForCertificateSubmit } from './obligation-presenter.js'
import { certificateSubmitPostPayloadSchema } from './schemas.js'
import { buildCertificateSubmitViewModel } from './view-model.js'
import {
  buildCertificateSubmitCacheKey,
  formatOrganisationName,
  readCertificateSubmitCacheRaw,
  writeCertificateSubmitCache
} from './utils.js'
import { certificateViewUrl } from '../certificate-view/controller.js'
import { certificateSuccessUrl } from '../certificate-success/controller.js'

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
    regulatorEmail
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
    submitterName: fullName.trim(),
    user: {
      id: user.id,
      email: user.email,
      name: formatNameOnAccount(user)
    }
  }
}

async function createComplianceDeclarationAndClearCache(
  request,
  organisationId,
  cacheKey,
  payload
) {
  const created =
    await request.server.app.wasteObligationsApi.createComplianceDeclaration(
      organisationId,
      payload
    )
  await request.server.app.redisClient.del(cacheKey)
  return created
}

export const certificateSubmitController = {
  method: 'GET',
  path: '/compliance/producer/{organisationId}/certificate/submit',
  options: {
    ...producerComplianceRouteOptions,
    pre: producerCompliancePre(
      middlewares.organisation,
      middlewares.declarations,
      middlewares.obligations
    )
  },
  async handler(request, h) {
    const { organisationId } = request.params
    const { year } = request.query
    const submittedDeclaration = pickLatestSubmittedDeclarationForYear(
      request.pre.declarations,
      year
    )

    if (submittedDeclaration) {
      return h.redirect(
        certificateViewUrl(
          organisationId,
          getLocale(request),
          submittedDeclaration.id
        )
      )
    }

    const organisation = request.pre?.organisation
    const regulator = getRegulatorDetails(organisation?.businessCountry)
    const { overallStatus } = presentObligationsForCertificateSubmit(
      request.pre.obligations
    )
    const cacheEntity = {
      organisation,
      organisationId,
      obligationYear: Number(year),
      obligations: request.pre.obligations,
      obligationStatus: overallStatus,
      regulatorName: regulator.name,
      regulatorEmail: regulator.email
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
        { err: error },
        `Failed to write certificate submit cache: organisationId=${organisationId}, year=${year}`
      )
      throw Boom.badGateway('Unable to prepare certificate of compliance')
    }

    return h.view(
      'compliance/producer/certificate-submit/index',
      buildCertificateSubmitViewModel(request, cacheEntity)
    )
  }
}

export const certificateSubmitPostController = {
  method: 'POST',
  path: '/compliance/producer/{organisationId}/certificate/submit',
  options: {
    ...producerComplianceRouteOptions,
    pre: producerCompliancePre({
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
            { err: error },
            `${message}: organisationId=${organisationId}, year=${year}`
          )
        }

        return null
      }
    }),
    validate: {
      ...producerComplianceRouteOptions.validate,
      payload: certificateSubmitPostPayloadSchema
    }
  },
  async handler(request, h) {
    const { organisationId } = request.params
    const { year } = request.query
    const { fullName } = request.payload
    const locale = getLocale(request)
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

    const formErrors = getFullNameFormErrors(fullName, locale)

    if (formErrors) {
      return h.view(
        'compliance/producer/certificate-submit/index',
        buildCertificateSubmitViewModel(request, cachedPayload, {
          formErrors,
          fullNameInput: fullName ?? ''
        })
      )
    }

    try {
      const payload = buildComplianceDeclarationApiPayload({
        cachedPayload,
        user,
        fullName,
        organisationNumber: request.pre.currentOrganisation.organisationNumber
      })

      const created = await createComplianceDeclarationAndClearCache(
        request,
        organisationId,
        cacheKey,
        payload
      )

      return h.redirect(
        certificateSuccessUrl(organisationId, locale, created.id)
      )
    } catch (error) {
      return handleComplianceSubmitFailure(request, h, {
        organisationId,
        year,
        complianceType: COMPLIANCE_SUBMIT_TYPES.certificate,
        error
      })
    }
  }
}

export const certificateSubmitRoutes = [
  certificateSubmitController,
  certificateSubmitPostController
]
