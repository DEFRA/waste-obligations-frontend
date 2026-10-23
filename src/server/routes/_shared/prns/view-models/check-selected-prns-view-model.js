import {
  hasLocaleKey,
  translate
} from '#/server/common/helpers/i18n/translate.js'
import { withForwardedPrefix } from '#/server/common/helpers/proxy/forwarded-prefix.js'
import { groupPrnsByMaterial } from './group-prns-by-material.js'
import {
  formatPrnIssuedAt,
  formatTonnage,
  prnDetailPath,
  prnIssuerName,
  prnTonnage
} from './prn-row-fields.js'

// `prns.checkSelection.material.<key>` for each material group. Fibre-based
// composite PRNs are grouped with paper (see groupPrnsByMaterial).
const GROUP_MATERIAL_KEYS = Object.freeze({
  Aluminium: 'aluminium',
  Glass: 'glassOther',
  GlassRemelt: 'glassRemelt',
  Paper: 'paper',
  Plastic: 'plastic',
  Steel: 'steel',
  Wood: 'wood'
})

// A table caption from `prns.checkSelection.material`, or the group's own
// heading for a material with no key there.
function groupHeading(locale, { material, heading }) {
  const key = `prns.checkSelection.material.${GROUP_MATERIAL_KEYS[material]}`

  return GROUP_MATERIAL_KEYS[material] && hasLocaleKey(locale, key)
    ? translate(locale, key)
    : heading
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
    tonnage: formatTonnage(prnTonnage(prn))
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
  const groups = groupPrnsByMaterial(prns, locale).map(
    ({ prns: groupPrns, ...group }) => ({
      ...group,
      heading: groupHeading(locale, group),
      totalTonnageText: formatTonnage(group.totalTonnage),
      rows: groupPrns.map((prn) =>
        buildRow({ prn, pathId, userType, request, year })
      )
    })
  )

  return { groups }
}
