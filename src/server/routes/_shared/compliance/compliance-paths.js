export function producerCertificatePath(organisationId, suffix = '') {
  return `/producer/${organisationId}/compliance/certificate${suffix}`
}

export function csoStatementPath(schemeId, suffix = '') {
  return `/cso/${schemeId}/compliance/statement${suffix}`
}
