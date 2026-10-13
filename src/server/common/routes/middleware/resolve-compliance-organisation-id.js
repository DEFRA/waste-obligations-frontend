export function resolveComplianceOrganisationId(request) {
  return request.params.organisationId ?? request.params.schemeId
}
