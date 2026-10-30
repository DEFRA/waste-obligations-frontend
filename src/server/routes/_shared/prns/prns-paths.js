import { withYearQuery } from '#/server/common/helpers/paths.js'
const producerBasePath = '/producer'
const csoBasePath = '/cso'

function withQuery(path, query) {
  const params = new URLSearchParams()

  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value))
    }
  }

  const queryString = params.toString()

  return queryString ? `${path}?${queryString}` : path
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

export function producerCheckSelectedPrnsPath(organisationId, year) {
  return withYearQuery(
    `${producerBasePath}/${organisationId}/prns/check-selection`,
    year
  )
}

export function producerAcceptedSelectionPrnsPath(organisationId, year) {
  return withYearQuery(
    `${producerBasePath}/${organisationId}/prns/accepted-selection`,
    year
  )
}

export function producerConfirmAcceptPrnPath(
  organisationId,
  prnId,
  year,
  acceptYear
) {
  return withQuery(
    `${producerBasePath}/${organisationId}/prns/${prnId}/confirm-accept`,
    { year, acceptYear }
  )
}

export function producerChooseYearPrnPath(organisationId, prnId, year) {
  return withYearQuery(
    `${producerBasePath}/${organisationId}/prns/${prnId}/choose-year`,
    year
  )
}

export function producerConfirmRejectPrnPath(organisationId, prnId, year) {
  return withYearQuery(
    `${producerBasePath}/${organisationId}/prns/${prnId}/confirm-reject`,
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

export function csoCheckSelectedPrnsPath(schemeId, year) {
  return withYearQuery(`${csoBasePath}/${schemeId}/prns/check-selection`, year)
}

export function csoAcceptedSelectionPrnsPath(schemeId, year) {
  return withYearQuery(
    `${csoBasePath}/${schemeId}/prns/accepted-selection`,
    year
  )
}

export function csoConfirmAcceptPrnPath(schemeId, prnId, year, acceptYear) {
  return withQuery(`${csoBasePath}/${schemeId}/prns/${prnId}/confirm-accept`, {
    year,
    acceptYear
  })
}

export function csoChooseYearPrnPath(schemeId, prnId, year) {
  return withYearQuery(
    `${csoBasePath}/${schemeId}/prns/${prnId}/choose-year`,
    year
  )
}

export function csoConfirmRejectPrnPath(schemeId, prnId, year) {
  return withYearQuery(
    `${csoBasePath}/${schemeId}/prns/${prnId}/confirm-reject`,
    year
  )
}

export function acceptPrnPath(organisationId, prnId) {
  return setApiPath(organisationId, prnId)
}

export function rejectPrnPath(organisationId, prnId) {
  return setApiPath(organisationId, prnId)
}
