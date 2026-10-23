import { translate } from '#/server/common/helpers/i18n/translate.js'
import {
  PRN_MATERIAL_FILTER_OPTIONS,
  prnMaterialLabel
} from '#/server/routes/_shared/prns/prns-sort-filter.js'
import { prnTonnage, roundTonnage } from './prn-row-fields.js'

/**
 * Material display order, reusing the list page's material filter (which also
 * names each material, see prnMaterialLabel) so every page names and orders
 * materials the same way.
 */
const MATERIAL_OPTIONS = PRN_MATERIAL_FILTER_OPTIONS.filter(
  ({ value }) => value
)

const PAPER_MATERIAL = 'Paper'

// Paper, board and fibre-based composite PRNs share one group, whatever
// variant name the API returns for them.
const PAPER_MATERIAL_PATTERN = /^(paper|fibre|fiber)/i

function materialGroup(material) {
  return PAPER_MATERIAL_PATTERN.test(material) ? PAPER_MATERIAL : material
}

function materialOrder(material) {
  const index = MATERIAL_OPTIONS.findIndex(({ value }) => value === material)

  return index === -1 ? MATERIAL_OPTIONS.length : index
}

function materialHeading(locale, material) {
  return (
    prnMaterialLabel(locale, material) ??
    (material || translate(locale, 'prns.list.notProvided'))
  )
}

/**
 * Group PRNs/PERNs by material, in material filter order with unknown
 * materials after known ones, alphabetically. Only `material` and `tonnage`
 * are read from each PRN.
 *
 * @param {Array} [prns]
 * @param {string} [locale]
 * @returns {Array<{ material: string, heading: string, totalTonnage: number, prns: Array }>}
 *   one group per material, with its PRNs in their given order
 */
export function groupPrnsByMaterial(prns = [], locale = 'en') {
  const groupsByMaterial = new Map()

  for (const prn of prns) {
    const material = materialGroup(prn.material ?? '')

    if (!groupsByMaterial.has(material)) {
      groupsByMaterial.set(material, {
        material,
        heading: materialHeading(locale, material),
        totalTonnage: 0,
        prns: []
      })
    }

    const group = groupsByMaterial.get(material)

    group.prns.push(prn)
    group.totalTonnage = roundTonnage(group.totalTonnage + prnTonnage(prn))
  }

  return [...groupsByMaterial.values()].sort(
    (a, b) =>
      materialOrder(a.material) - materialOrder(b.material) ||
      a.heading.localeCompare(b.heading)
  )
}
