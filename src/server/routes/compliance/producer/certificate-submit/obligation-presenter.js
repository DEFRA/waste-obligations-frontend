import { resolveComponentLocaleKey } from '#/server/common/helpers/i18n/translate.js'

const MATERIAL_KEY_SUFFIX = {
  Paper: 'material.paperComposite',
  Plastic: 'material.plastic',
  Wood: 'material.wood',
  Steel: 'material.steel',
  Aluminium: 'material.aluminium',
  GlassRemelt: 'material.glassRemelt'
}

const GLASS_AGGREGATE_KEY_SUFFIX = 'material.glass'
const GLASS_REMAINING_KEY_SUFFIX = 'material.glassRemaining'
const TOTALS_KEY_SUFFIX = 'table.totalsRow'

const STATUS_VARIANT = {
  Met: 'green',
  NotMet: 'yellow',
  NoDataYet: 'grey'
}

const STATUS_KEY_SUFFIX = {
  Met: 'obligationStatus.met',
  NotMet: 'obligationStatus.notMet',
  NoDataYet: 'obligationStatus.noDataYet'
}

function obligationsTableKey(locale, pageLocaleBase, key) {
  return resolveComponentLocaleKey(
    locale,
    pageLocaleBase,
    'obligationsTable',
    key
  )
}

function materialI18nKey(locale, pageLocaleBase, material) {
  if (material === 'Glass') {
    return obligationsTableKey(
      locale,
      pageLocaleBase,
      GLASS_REMAINING_KEY_SUFFIX
    )
  }

  const suffix = MATERIAL_KEY_SUFFIX[material]

  return suffix
    ? obligationsTableKey(locale, pageLocaleBase, suffix)
    : undefined
}

function statusTag(locale, pageLocaleBase, status) {
  const variant = STATUS_VARIANT[status]
  const keySuffix = STATUS_KEY_SUFFIX[status]

  if (!variant || !keySuffix) {
    return undefined
  }

  return {
    variant,
    i18nKey: obligationsTableKey(locale, pageLocaleBase, keySuffix)
  }
}

/** Matches epr-packaging MaterialType ordering (OrderBy MaterialName). */
const MATERIAL_SORT_KEY = {
  Paper: 'Paper',
  Plastic: 'Plastic',
  Wood: 'Wood',
  Steel: 'Steel',
  Aluminium: 'Aluminium',
  Glass: 'Glass',
  GlassRemelt: 'GlassRemelt',
  RemainingGlass: 'RemainingGlass'
}

const GLASS_BREAKDOWN_MATERIALS = ['GlassRemelt', 'Glass']
const MAIN_TABLE_EXCLUDED_MATERIALS = new Set(GLASS_BREAKDOWN_MATERIALS)

const SUM_KEYS = [
  'obligationToMeet',
  'awaitingAcceptance',
  'accepted',
  'outstanding'
]

function zeroTotals() {
  return Object.fromEntries(SUM_KEYS.map((k) => [k, 0]))
}

function sumRows(rows) {
  return rows.reduce((acc, r) => {
    for (const k of SUM_KEYS) {
      acc[k] += r[k]
    }
    return acc
  }, zeroTotals())
}

function materialSortKey(material) {
  if (material === 'Glass') {
    return MATERIAL_SORT_KEY.RemainingGlass
  }

  if (material === 'GlassAggregate') {
    return MATERIAL_SORT_KEY.Glass
  }

  return MATERIAL_SORT_KEY[material] ?? material
}

function compareMaterialRows(a, b) {
  return materialSortKey(a.material).localeCompare(
    materialSortKey(b.material),
    undefined,
    { sensitivity: 'base' }
  )
}

function toRow(obligation, locale, pageLocaleBase) {
  const tonnages = obligation.tonnages
  const status = obligation.status
  const material = obligation.material

  return {
    material,
    materialKey: materialI18nKey(locale, pageLocaleBase, material),
    obligationToMeet: Number(tonnages.obligated ?? 0),
    awaitingAcceptance: Number(tonnages.awaitingAcceptance ?? 0),
    accepted: Number(tonnages.accepted ?? 0),
    outstanding: Number(tonnages.outstanding ?? 0),
    status,
    tag: statusTag(locale, pageLocaleBase, status)
  }
}

function glassRow(obligations, material, locale, pageLocaleBase) {
  const found = obligations.find(
    (obligation) => obligation.material === material
  )

  if (found) {
    return toRow(found, locale, pageLocaleBase)
  }

  return {
    material,
    materialKey: materialI18nKey(locale, pageLocaleBase, material),
    ...zeroTotals(),
    status: 'Met',
    tag: statusTag(locale, pageLocaleBase, 'Met')
  }
}

function aggregateGlassRow(glassDataRows, locale, pageLocaleBase) {
  const status = deriveOverallStatus(glassDataRows)

  return {
    material: 'GlassAggregate',
    materialKey: obligationsTableKey(
      locale,
      pageLocaleBase,
      GLASS_AGGREGATE_KEY_SUFFIX
    ),
    ...sumRows(glassDataRows),
    status,
    tag: statusTag(locale, pageLocaleBase, status)
  }
}

function totalsRow(overallStatus, totals, locale, pageLocaleBase) {
  return {
    material: 'Totals',
    isTotals: true,
    materialKey: obligationsTableKey(locale, pageLocaleBase, TOTALS_KEY_SUFFIX),
    ...totals,
    status: overallStatus,
    tag: statusTag(locale, pageLocaleBase, overallStatus)
  }
}

function deriveOverallStatus(rows) {
  const statuses = new Set(rows.map((r) => r.status))

  if (statuses.has('NotMet')) {
    return 'NotMet'
  }

  if (statuses.has('Met')) {
    return 'Met'
  }

  return 'NoDataYet'
}

export function presentObligationsForCertificateSubmit(
  obligations,
  { locale = 'en', pageLocaleBase = null } = {}
) {
  const list = obligations ?? []

  const glassDataRows = GLASS_BREAKDOWN_MATERIALS.map((material) =>
    glassRow(list, material, locale, pageLocaleBase)
  ).sort(compareMaterialRows)

  const mainMaterialRows = list
    .filter(
      (obligation) => !MAIN_TABLE_EXCLUDED_MATERIALS.has(obligation.material)
    )
    .map((obligation) => toRow(obligation, locale, pageLocaleBase))
    .sort(compareMaterialRows)

  mainMaterialRows.push(
    aggregateGlassRow(glassDataRows, locale, pageLocaleBase)
  )
  mainMaterialRows.sort(compareMaterialRows)

  const overallStatus = deriveOverallStatus(mainMaterialRows)
  const obligationsRows = [
    ...mainMaterialRows,
    totalsRow(overallStatus, sumRows(mainMaterialRows), locale, pageLocaleBase)
  ]

  const glassOverall = deriveOverallStatus(glassDataRows)
  const glassRows = [
    ...glassDataRows,
    totalsRow(glassOverall, sumRows(glassDataRows), locale, pageLocaleBase)
  ]

  return { overallStatus, obligationsRows, glassRows }
}
