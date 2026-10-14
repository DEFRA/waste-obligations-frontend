import { translate } from '#/server/common/helpers/i18n/translate.js'
import { withForwardedPrefix } from '#/server/common/helpers/proxy/forwarded-prefix.js'
import { PRN_MATERIAL_FILTER_OPTIONS } from '#/server/routes/_shared/prns/prns-sort-filter.js'
import {
  formatPrnIssuedAt,
  prnDetailPath,
  prnIssuerName,
  prnTonnage
} from './prn-row-fields.js'

/**
 * Material display order and `prns.list.filter.<key>` label, reusing the list
 * page's material filter so both pages name and order materials the same way.
 */
const MATERIAL_OPTIONS = PRN_MATERIAL_FILTER_OPTIONS.filter(
  ({ value }) => value
)

const PAPER_MATERIAL = 'Paper'

// Paper, board and fibre-based composite PRNs share one table, whatever
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
  const option = MATERIAL_OPTIONS.find(({ value }) => value === material)

  if (option) {
    return translate(locale, `prns.list.filter.${option.key}`)
  }

  return material || translate(locale, 'prns.list.notProvided')
}

function buildRow({ prn, pathId, userType, request, year }) {
  return {
    id: prn.id,
    number: prn.number,
    // Each row is one specific PRN, so its own obligation year - not the
    // page's query year, which may be stale or belong to a different
    // selection - is what the link should reflect. The query year is only a
    // fallback for the rare PRN with no obligation year of its own.
    href: withForwardedPrefix(
      request,
      prnDetailPath(userType, pathId, prn.id, prn.obligationYear ?? year)
    ),
    issuedAt: formatPrnIssuedAt(prn),
    issuer: prnIssuerName(prn),
    tonnage: prnTonnage(prn)
  }
}

/**
 * Build the view model for the "check your selection before accepting" page:
 * the selected PRNs/PERNs grouped into one table per material, each with its
 * total tonnage.
 *
 * @param {object} options
 * @param {Array} [options.prns]
 * @param {string} options.pathId
 * @param {'producer'|'cso'} options.userType
 * @param {string} [options.locale]
 * @param {object} [options.request]
 * @param {number} [options.year] fallback link year for a PRN with no
 *   obligation year of its own; each row otherwise links using its own
 *   `prn.obligationYear`
 */
export function buildCheckSelectedPrnsViewModel({
  prns = [],
  pathId,
  userType,
  locale = 'en',
  request,
  year
} = {}) {
  const groupsByMaterial = new Map()

  for (const prn of prns) {
    const material = materialGroup(prn.material ?? '')

    if (!groupsByMaterial.has(material)) {
      groupsByMaterial.set(material, {
        material,
        heading: materialHeading(locale, material),
        rows: [],
        totalTonnage: 0
      })
    }

    const group = groupsByMaterial.get(material)
    const row = buildRow({ prn, pathId, userType, request, year })

    group.rows.push(row)
    group.totalTonnage += row.tonnage
  }

  const groups = [...groupsByMaterial.values()].sort(
    (a, b) =>
      materialOrder(a.material) - materialOrder(b.material) ||
      a.heading.localeCompare(b.heading)
  )

  return { groups }
}
