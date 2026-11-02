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

function obligationMaterialPath(basePath, id, materialSlug, year) {
  return withYearQuery(`${basePath}/${id}/obligations/${materialSlug}`, year)
}

export function csoObligationMaterialPath(schemeId, materialSlug, year) {
  return obligationMaterialPath('/cso', schemeId, materialSlug, year)
}
export function producerObligationMaterialPath(
  organisationId,
  materialSlug,
  year
) {
  return obligationMaterialPath('/producer', organisationId, materialSlug, year)
}
