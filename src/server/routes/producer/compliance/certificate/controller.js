import { getLocale } from '#/server/common/helpers/i18n/get-locale.js'
import { withForwardedPrefix } from '#/server/common/helpers/proxy/forwarded-prefix.js'
import { getRegulatorDetails } from '#/server/routes/_shared/compliance/regulator.js'
import { pickLatestSubmittedDeclarationForYear } from '#/server/routes/_shared/compliance/compliance-declaration.js'
import { producerCertificatePath } from '#/server/routes/_shared/compliance/compliance-paths.js'
import {
  producerCompliancePre,
  producerComplianceRouteOptions
} from '#/server/routes/_shared/compliance/compliance-route-options.js'
import * as middlewares from '#/server/routes/_shared/compliance/_middlewares/index.js'

export const certificateController = {
  method: 'GET',
  path: '/producer/{organisationId}/compliance/certificate',
  options: {
    ...producerComplianceRouteOptions,
    pre: producerCompliancePre(
      middlewares.organisation,
      middlewares.declarations
    )
  },
  async handler(request, h) {
    const { organisationId } = request.params
    const { year } = request.query
    const submittedDeclaration = pickLatestSubmittedDeclarationForYear(
      request.pre.declarations,
      year
    )
    const regulator = getRegulatorDetails(
      request.pre.organisation?.businessCountry,
      getLocale(request)
    )

    return h.view('producer/compliance/certificate/index', {
      organisationId,
      year,
      regulatorName: regulator.nameWithArticle,
      regulatorEmail: regulator.email,
      showContinueToSubmit: submittedDeclaration == null,
      submittedComplianceDeclarationId: submittedDeclaration?.id,
      submitHref: withForwardedPrefix(
        request,
        producerCertificatePath(organisationId, `/submit?year=${year}`)
      ),
      submittedDeclarationSuccessHref: submittedDeclaration
        ? withForwardedPrefix(
            request,
            producerCertificatePath(
              organisationId,
              `/${submittedDeclaration.id}/success`
            )
          )
        : undefined
    })
  }
}

export const certificateRoutes = [certificateController]
