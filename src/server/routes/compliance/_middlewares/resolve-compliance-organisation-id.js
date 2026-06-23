export function resolveComplianceOrganisationId(request) {
  return (
    request.params.organisationId ??
    request.pre.currentComplianceScheme?.operatorOrganisationId
  )
}
