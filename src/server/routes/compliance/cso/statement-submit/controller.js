import Boom from '@hapi/boom'

import { REGULATION_43_URL } from '#/config/constants.js'
import { getLocale } from '#/server/common/helpers/i18n/get-locale.js'
import { logApplicationError } from '#/server/common/helpers/logging/application-error.js'
import { translate } from '#/server/common/helpers/i18n/translate.js'
import * as middlewares from '#/server/routes/compliance/_middlewares/index.js'
import { pickLatestSubmittedDeclarationForYear } from '#/server/routes/compliance/_shared/compliance-declaration.js'
import { buildStatementComplianceDeclarationPayload } from '#/server/routes/compliance/_shared/compliance-submit/api-payload.js'
import { createSubmitCachePreHandler } from '#/server/routes/compliance/_shared/compliance-submit/cache-pre-handler.js'
import { mergeFormErrors } from '#/server/routes/compliance/_shared/compliance-submit/form-errors.js'
import { createComplianceDeclarationAndClearCache } from '#/server/routes/compliance/_shared/compliance-submit/submit-service.js'
import {
  csoCompliancePre,
  csoComplianceRouteOptions
} from '#/server/routes/compliance/_shared/compliance-route-options.js'
import { getFullNameFormErrors } from '#/server/routes/compliance/_shared/full-name-validation.js'
import { getRegulation43FormErrors } from '#/server/routes/compliance/_shared/regulation43-validation.js'
import { getRegulatorDetails } from '#/server/routes/compliance/_shared/regulator.js'
import {
  COMPLIANCE_SUBMIT_TYPES,
  handleComplianceSubmitFailure
} from '#/server/routes/compliance/_shared/submit-error.js'
import { presentObligationsForCertificateSubmit } from '#/server/routes/compliance/producer/certificate-submit/obligation-presenter.js'

import { statementSubmitPostPayloadSchema } from './schemas.js'
import { buildStatementSubmitViewModel } from './view-model.js'
import { statementSuccessUrl } from '../statement-success/controller.js'
import { statementViewUrl } from '../statement-view/controller.js'
import {
  buildStatementSubmitCacheKey,
  readStatementSubmitCacheRaw,
  resolveOperatorOrganisationNumber,
  writeStatementSubmitCache
} from './utils.js'

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
      return h.redirect(
        statementViewUrl(schemeId, getLocale(request), submittedDeclaration.id)
      )
    }

    const organisation = request.pre?.organisation
    const locale = getLocale(request)
    const regulator = getRegulatorDetails(organisation?.businessCountry)
    const { overallStatus } = presentObligationsForCertificateSubmit(
      request.pre.obligations,
      { locale, pageLocaleBase: 'compliance.statementSubmit' }
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
      logApplicationError(
        request.logger,
        'error',
        error,
        `Failed to write statement submit cache: schemeId=${schemeId}, year=${year}`
      )
      throw Boom.badGateway(
        translate(getLocale(request), 'compliance.errors.prepareStatement')
      )
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
    pre: csoCompliancePre(
      createSubmitCachePreHandler({
        buildCacheKey: buildStatementSubmitCacheKey,
        readCacheRaw: readStatementSubmitCacheRaw,
        entityIdParam: 'schemeId'
      })
    ),
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
        translate(locale, 'compliance.errors.missingSubmitCache', { year })
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
      const payload = buildStatementComplianceDeclarationPayload({
        cachedPayload,
        user,
        fullName,
        regulation43Compliant,
        locale
      })

      const created = await createComplianceDeclarationAndClearCache(
        request,
        schemeId,
        cacheKey,
        payload
      )

      const successUrl = statementSuccessUrl(schemeId, locale, created.id)

      return h.redirect(successUrl)
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
