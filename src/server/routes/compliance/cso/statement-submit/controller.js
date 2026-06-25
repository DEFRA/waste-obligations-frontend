import Boom from '@hapi/boom'

import { config } from '#/config/config.js'
import { REGULATION_43_URL } from '#/config/constants.js'
import { getLocale } from '#/server/common/helpers/i18n/get-locale.js'
import { RedisCacheValidationError } from '#/server/common/helpers/validate-redis-cache.js'
import * as middlewares from '#/server/routes/compliance/_middlewares/index.js'
import { pickLatestSubmittedDeclarationForYear } from '#/server/routes/compliance/_shared/compliance-declaration.js'
import {
  csoCompliancePre,
  csoComplianceRouteOptions
} from '#/server/routes/compliance/_shared/compliance-route-options.js'
import { getFullNameFormErrors } from '#/server/routes/compliance/_shared/full-name-validation.js'
import { formatNameOnAccount } from '#/server/routes/compliance/_shared/name-on-account.js'
import {
  getRegulation43FormErrors,
  isRegulation43Compliant
} from '#/server/routes/compliance/_shared/regulation43-validation.js'
import { getRegulatorDetails } from '#/server/routes/compliance/_shared/regulator.js'
import {
  COMPLIANCE_SUBMIT_TYPES,
  handleComplianceSubmitFailure
} from '#/server/routes/compliance/_shared/submit-error.js'
import { presentObligationsForCertificateSubmit } from '#/server/routes/compliance/producer/certificate-submit/obligation-presenter.js'

import { statementSubmitPostPayloadSchema } from './schemas.js'
import { buildStatementSubmitViewModel } from './view-model.js'
import {
  buildStatementSubmitCacheKey,
  formatComplianceSchemeName,
  formatSchemeOperatorName,
  readStatementSubmitCacheRaw,
  resolveOperatorOrganisationNumber,
  writeStatementSubmitCache
} from './utils.js'

function mergeFormErrors(...errors) {
  const defined = errors.filter(Boolean)

  if (defined.length === 0) {
    return null
  }

  return {
    summary: defined.flatMap((error) => error.summary),
    fields: defined.reduce(
      (fields, error) => ({ ...fields, ...error.fields }),
      {}
    )
  }
}

function buildComplianceDeclarationApiPayload({
  cachedPayload,
  user,
  fullName,
  regulation43Compliant
}) {
  const {
    organisation,
    obligationYear,
    obligations,
    obligationStatus,
    regulatorName,
    regulatorEmail,
    organisationNumber
  } = cachedPayload
  const complianceSchemeName = formatComplianceSchemeName(
    organisation,
    obligationYear
  )

  return {
    organisation: {
      id: organisation.id,
      name: null,
      referenceNumber: organisationNumber,
      address: organisation.address,
      complianceSchemeName,
      schemeOperatorName: formatSchemeOperatorName(organisation),
      regulator: regulatorName,
      regulatorEmail
    },
    obligations,
    obligationYear,
    obligationStatus,
    submitterName: fullName.trim(),
    isRegulation43Compliant: isRegulation43Compliant(regulation43Compliant),
    user: {
      id: user.id,
      email: user.email,
      name: formatNameOnAccount(user)
    }
  }
}

async function createComplianceDeclarationAndClearCache(
  request,
  schemeId,
  cacheKey,
  payload
) {
  const created =
    await request.server.app.wasteObligationsApi.createComplianceDeclaration(
      schemeId,
      payload
    )
  await request.server.app.redisClient.del(cacheKey)
  return created
}

function manageObligationsRedirectUrl() {
  return config.get('eprPackaging.manageYourRecyclingObligationsUrl')
}

export const statementSubmitController = {
  method: 'GET',
  path: '/compliance/cso/{schemeId}/statement/submit',
  options: {
    ...csoComplianceRouteOptions,
    pre: csoCompliancePre(
      middlewares.organisation,
      middlewares.declarations,
      middlewares.obligations
    )
  },
  async handler(request, h) {
    const { schemeId } = request.params
    const { year } = request.query
    const submittedDeclaration = pickLatestSubmittedDeclarationForYear(
      request.pre.declarations,
      year
    )

    if (submittedDeclaration) {
      return h.redirect(manageObligationsRedirectUrl())
    }

    const organisation = request.pre?.organisation
    const regulator = getRegulatorDetails(organisation?.businessCountry)
    const { overallStatus } = presentObligationsForCertificateSubmit(
      request.pre.obligations
    )
    const cacheEntity = {
      organisation,
      schemeId,
      obligationYear: Number(year),
      obligations: request.pre.obligations,
      obligationStatus: overallStatus,
      regulatorName: regulator.name,
      regulatorEmail: regulator.email,
      organisationNumber: resolveOperatorOrganisationNumber(request)
    }

    try {
      await writeStatementSubmitCache(
        request.server.app.redisClient,
        buildStatementSubmitCacheKey(
          request.yar.get('user').id,
          schemeId,
          year
        ),
        cacheEntity
      )
    } catch (error) {
      request.logger.error(
        { err: error },
        `Failed to write statement submit cache: schemeId=${schemeId}, year=${year}`
      )
      throw Boom.badGateway('Unable to prepare statement of compliance')
    }

    return h.view(
      'compliance/cso/statement-submit/index',
      buildStatementSubmitViewModel(request, cacheEntity, {
        regulation43Url: REGULATION_43_URL
      })
    )
  }
}

export const statementSubmitPostController = {
  method: 'POST',
  path: '/compliance/cso/{schemeId}/statement/submit',
  options: {
    ...csoComplianceRouteOptions,
    pre: csoCompliancePre({
      assign: 'cachedPayload',
      method: async (request) => {
        const { schemeId } = request.params
        const { year } = request.query
        const cacheKey = buildStatementSubmitCacheKey(
          request.yar.get('user').id,
          schemeId,
          year
        )

        try {
          return await readStatementSubmitCacheRaw(
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
            `${message}: schemeId=${schemeId}, year=${year}`
          )
        }

        return null
      }
    }),
    validate: {
      ...csoComplianceRouteOptions.validate,
      payload: statementSubmitPostPayloadSchema
    }
  },
  async handler(request, h) {
    const { schemeId } = request.params
    const { year } = request.query
    const { fullName, regulation43Compliant } = request.payload
    const locale = getLocale(request)
    const user = request.yar.get('user')
    const cacheKey = buildStatementSubmitCacheKey(user.id, schemeId, year)
    const cachedPayload = request.pre.cachedPayload

    if (!cachedPayload) {
      throw Boom.badRequest(
        `Unable to find submit cache payload for ${year} year`
      )
    }

    const formErrors = mergeFormErrors(
      getFullNameFormErrors(fullName, locale),
      getRegulation43FormErrors(regulation43Compliant, locale)
    )

    if (formErrors) {
      return h.view(
        'compliance/cso/statement-submit/index',
        buildStatementSubmitViewModel(request, cachedPayload, {
          formErrors,
          fullNameInput: fullName ?? '',
          regulation43Input: regulation43Compliant ?? '',
          regulation43Url: REGULATION_43_URL
        })
      )
    }

    try {
      const payload = buildComplianceDeclarationApiPayload({
        cachedPayload,
        user,
        fullName,
        regulation43Compliant
      })

      await createComplianceDeclarationAndClearCache(
        request,
        schemeId,
        cacheKey,
        payload
      )

      return h.redirect(manageObligationsRedirectUrl())
    } catch (error) {
      return handleComplianceSubmitFailure(request, h, {
        organisationId: schemeId,
        year,
        complianceType: COMPLIANCE_SUBMIT_TYPES.statement,
        error
      })
    }
  }
}

export const statementSubmitRoutes = [
  statementSubmitController,
  statementSubmitPostController
]
