const producerBasePath = '/producer'
const csoBasePath = '/cso'

function withYearQuery(path, year) {
  return year === undefined || year === null || year === ''
    ? path
    : `${path}?year=${year}`
}

function setApiPath(organisationId, prnId) {
  return `${producerBasePath}/${organisationId}/prns/${prnId}`
}

// Producer paths
export function producerPrnsPath(organisationId, year) {
  return withYearQuery(`${producerBasePath}/${organisationId}/prns`, year)
}

export function producerPrnPath(organisationId, prnId, year) {
  return withYearQuery(
    `${producerBasePath}/${organisationId}/prns/${prnId}`,
    year
  )
}

export function producerConfirmAcceptPrnPath(organisationId, prnId, year) {
  return withYearQuery(
    `${producerBasePath}/${organisationId}/prns/${prnId}/confirm-accept`,
    year
  )
}

// CSO paths
export function csoPrnsPath(schemeId, year) {
  return withYearQuery(`${csoBasePath}/${schemeId}/prns`, year)
}

export function csoPrnPath(schemeId, prnId, year) {
  return withYearQuery(`${csoBasePath}/${schemeId}/prns/${prnId}`, year)
}

export function csoConfirmAcceptPrnPath(schemeId, prnId, year) {
  return withYearQuery(
    `${csoBasePath}/${schemeId}/prns/${prnId}/confirm-accept`,
    year
  )
}

export function acceptPrnPath(organisationId, prnId) {
  return setApiPath(organisationId, prnId)
}

export function rejectPrnPath(organisationId, prnId) {
  return setApiPath(organisationId, prnId)
}
