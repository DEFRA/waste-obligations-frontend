import {
  obligationStatusI18nKey,
  presentObligationsForCertificateSubmit
} from '../certificate-submit/obligation-presenter.js'
import { getRegulatorDetails } from '../_shared/regulator.js'
import { PUBLIC_REGISTER_URL } from '#/config/constants.js'
import * as middlewares from '../_middlewares/index.js'
import { complianceRouteOptions } from '../_shared/compliance-route-options.js'

function pickLatestDeclarationForYear(declarations, year) {
  const y = Number(year)
  const rows = (declarations ?? []).filter((d) => d?.obligationYear === y)
  return rows.length > 0
    ? rows.reduce((best, d) =>
        new Date(d.updated ?? d.created ?? 0) >
        new Date(best.updated ?? best.created ?? 0)
          ? d
          : best
      )
    : null
}

function buildCertificateSuccessViewModel(pre, year) {
  const latest = pickLatestDeclarationForYear(pre?.declarations, year)
  if (latest) {
    return {
      obligationStatusKey: obligationStatusI18nKey(latest.obligationStatus)
    }
  }

  const { overallStatus } = presentObligationsForCertificateSubmit(
    pre.obligations
  )

  return {
    obligationStatusKey: obligationStatusI18nKey(overallStatus)
  }
}

export const certificateSuccessController = {
  method: 'GET',
  path: '/compliance/{organisationId}/certificate/success',
  options: {
    ...complianceRouteOptions,
    pre: [
      middlewares.organisation,
      middlewares.declarations,
      middlewares.obligations
    ]
  },
  async handler(request, h) {
    const { year } = request.query
    const { organisationId } = request.params
    const { obligationStatusKey } = buildCertificateSuccessViewModel(
      request.pre,
      request.query.year
    )
    const regulator = getRegulatorDetails(
      request.pre?.organisation?.businessCountry
    )

    return h.view('compliance/certificate-success/index', {
      organisationId,
      year,
      obligationStatusKey,
      regulatorName: regulator.name,
      regulatorEmail: regulator.email,
      publicRegisterUrl: PUBLIC_REGISTER_URL
    })
  }
}

export const certificateSuccessRoutes = [certificateSuccessController]
