function setApiPath(organisationId, prnId) {
  return `/producer/${organisationId}/prns/${prnId}`
}

export function producerPrnsPath(organisationId) {
  return `/producer/${organisationId}/prns`
}

export function csoPrnsPath(schemeId) {
  return `/cso/${schemeId}/prns`
}

export function acceptPrnPath(organisationId, prnId) {
  return setApiPath(organisationId, prnId)
}

export function rejectPrnPath(organisationId, prnId) {
  return setApiPath(organisationId, prnId)
}
