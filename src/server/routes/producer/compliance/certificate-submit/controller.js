import Boom from '@hapi/boom'

import { getLocale } from '#/server/common/helpers/i18n/get-locale.js'
import { logApplicationError } from '#/server/common/helpers/logging/application-error.js'
import { translate } from '#/server/common/helpers/i18n/translate.js'
import * as middlewares from '#/server/routes/_shared/compliance/_middlewares/index.js'
import { pickLatestSubmittedDeclarationForYear } from '#/server/routes/_shared/compliance/compliance-declaration.js'
import { buildProducerComplianceDeclarationPayload } from '#/server/routes/_shared/compliance/compliance-submit/api-payload.js'
import { createSubmitCachePreHandler } from '#/server/routes/_shared/compliance/compliance-submit/cache-pre-handler.js'
import { createComplianceDeclarationAndClearCache } from '#/server/routes/_shared/compliance/compliance-submit/submit-service.js'
import {
  producerCompliancePre,
  producerComplianceRouteOptions
} from '#/server/routes/_shared/compliance/compliance-route-options.js'
import { getFullNameFormErrors } from '#/server/routes/_shared/compliance/full-name-validation.js'
import { getRegulatorDetails } from '#/server/routes/_shared/compliance/regulator.js'
import {
  COMPLIANCE_SUBMIT_TYPES,
  handleComplianceSubmitFailure
} from '#/server/routes/_shared/compliance/submit-error.js'

import { presentObligationsForCertificateSubmit } from './obligation-presenter.js'
import { certificateSubmitPostPayloadSchema } from './schemas.js'
import { buildCertificateSubmitViewModel } from './view-model.js'
import {
  buildCertificateSubmitCacheKey,
  readCertificateSubmitCacheRaw,
  writeCertificateSubmitCache
} from './utils.js'
import { certificateViewUrl } from '../certificate-view/controller.js'
import { certificateSuccessUrl } from '../certificate-success/controller.js'

export const certificateSubmitController = {
  method: 'GET',
  path: '/producer/{organisationId}/compliance/certificate/submit',
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
    const locale = getLocale(request)
    const regulator = getRegulatorDetails(organisation?.businessCountry)
    const { overallStatus } = presentObligationsForCertificateSubmit(
      request.pre.obligations,
      { locale, pageLocaleBase: 'compliance.certificateSubmit' }
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
      logApplicationError(
        request.logger,
        'error',
        error,
        `Failed to write certificate submit cache: organisationId=${organisationId}, year=${year}`
      )
      throw Boom.badGateway(
        translate(getLocale(request), 'compliance.errors.prepareCertificate')
      )
    }

    return h.view(
      'producer/compliance/certificate-submit/index',
      buildCertificateSubmitViewModel(request, cacheEntity)
    )
  }
}

export const certificateSubmitPostController = {
  method: 'POST',
  path: '/producer/{organisationId}/compliance/certificate/submit',
  options: {
    ...producerComplianceRouteOptions,
    pre: producerCompliancePre(
      createSubmitCachePreHandler({
        buildCacheKey: buildCertificateSubmitCacheKey,
        readCacheRaw: readCertificateSubmitCacheRaw,
        entityIdParam: 'organisationId'
      })
    ),
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
        translate(locale, 'compliance.errors.missingSubmitCache', { year })
      )
    }

    const formErrors = getFullNameFormErrors(fullName, locale)

    if (formErrors) {
      return h.view(
        'producer/compliance/certificate-submit/index',
        buildCertificateSubmitViewModel(request, cachedPayload, {
          formErrors,
          fullNameInput: fullName ?? ''
        })
      )
    }

    try {
      const payload = buildProducerComplianceDeclarationPayload({
        cachedPayload,
        user,
        fullName,
        organisationNumber: request.pre.currentOrganisation.organisationNumber,
        locale
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
