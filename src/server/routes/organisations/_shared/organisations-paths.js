const producerBasePath = '/organisations/producer'
const csoBasePath = '/organisations/cso'

function withYearQuery(path, year) {
  return year === undefined || year === null || year === ''
    ? path
    : `${path}?year=${year}`
}

// Producer paths
export function producerPrnsPath(organisationId) {
  return `${producerBasePath}/${organisationId}/prns`
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
export function csoPrnsPath(schemeId) {
  return `${csoBasePath}/${schemeId}/prns`
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
