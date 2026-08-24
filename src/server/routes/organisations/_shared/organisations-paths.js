function setApiPath(organisationId, prnId) {
  return `/organisations/producer/${organisationId}/prns/${prnId}`
}

export function producerPrnsPath(organisationId) {
  return `/organisations/producer/${organisationId}/prns`
}

export function csoPrnsPath(schemeId) {
  return `/organisations/cso/${schemeId}/prns`
}

export function acceptPrnPath(organisationId, prnId) {
  return setApiPath(organisationId, prnId)
}

export function rejectPrnPath(organisationId, prnId) {
  return setApiPath(organisationId, prnId)
}
