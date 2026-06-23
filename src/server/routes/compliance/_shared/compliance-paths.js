export function producerCertificatePath(organisationId, suffix = '') {
  return `/compliance/producer/${organisationId}/certificate${suffix}`
}

export function csoStatementPath(schemeId, suffix = '') {
  return `/compliance/cso/${schemeId}/statement${suffix}`
}
