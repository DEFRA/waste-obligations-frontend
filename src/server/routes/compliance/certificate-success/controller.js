import {
  formatCertificateObligationStatusForView,
  presentObligationsForCertificateSubmit
} from '../certificate-submit/obligation-presenter.js'
import { getRegulatorDetails } from '../_shared/regulator.js'
import { PUBLIC_REGISTER_URL } from '#/config/constants.js'
import {
  organisation,
  declarations,
  obligations
} from '../_middlewares/index.js'
import { complianceRouteOptions } from '../_shared/compliance-route-options.js'

function pickLatestDeclarationForYear(res, year) {
  const y = Number(year)
  const rows = (res?.complianceDeclarations ?? []).filter(
    (d) => d?.obligationYear === y
  )
  if (!rows.length) return null
  return rows.reduce((best, d) =>
    new Date(d.updated ?? d.created ?? 0) >
    new Date(best.updated ?? best.created ?? 0)
      ? d
      : best
  )
}

function buildCertificateSuccessViewModel(pre, year) {
  const latest = pickLatestDeclarationForYear(pre?.declarations, year)
  if (latest) {
    return {
      obligationStatus: formatCertificateObligationStatusForView(
        latest.obligationStatus
      ),
      approvedUserEmail: latest.user?.email ?? ''
    }
  }
  const obs = pre?.obligations?.obligations ?? []
  if (!obs.length) return { obligationStatus: '', approvedUserEmail: '' }
  const { overallStatus } = presentObligationsForCertificateSubmit(
    pre.obligations
  )
  return {
    obligationStatus: formatCertificateObligationStatusForView(overallStatus),
    approvedUserEmail: ''
  }
}

export const certificateSuccessController = {
  method: 'GET',
  path: '/compliance/{organisationId}/certificate/success',
  options: {
    ...complianceRouteOptions,
    pre: [organisation, declarations, obligations]
  },
  async handler(request, h) {
    const { year } = request.query
    const { organisationId } = request.params
    const { obligationStatus, approvedUserEmail } =
      buildCertificateSuccessViewModel(request.pre, request.query.year)

    const regulator = getRegulatorDetails(
      request.pre?.organisation?.businessCountry
    )

    return h.view('compliance/certificate-success/index', {
      pageTitle: 'Certificate success',
      organisationId,
      year,
      obligationStatus,
      approvedUserEmail,
      regulatorName: regulator.name,
      regulatorEmail: regulator.email,
      publicRegisterUrl: PUBLIC_REGISTER_URL,
      breadcrumbs: [{ text: 'Home', href: '/' }, { text: 'Compliance' }]
    })
  }
}

export const certificateSuccessRoutes = [certificateSuccessController]
