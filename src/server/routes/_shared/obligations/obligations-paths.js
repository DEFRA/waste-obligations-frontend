import { withYearQuery } from '#/server/common/helpers/paths.js'

function obligationsHomePath(basePath, id, year) {
  return withYearQuery(`${basePath}/${id}/obligations`, year)
}

export function csoObligationsHomePath(schemeId, year) {
  return obligationsHomePath('/cso', schemeId, year)
}
export function producerObligationsHomePath(organisationId, year) {
  return obligationsHomePath('/producer', organisationId, year)
}
