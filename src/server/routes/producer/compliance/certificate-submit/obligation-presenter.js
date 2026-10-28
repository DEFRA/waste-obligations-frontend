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

/**
 * The obligations table locale key naming a material, or undefined for a
 * material the table has no name for. Non-remelt glass ('Glass') is named
 * "Remaining glass". Shared so other pages name materials as this table does.
 *
 * @param {string} locale
 * @param {string|null} pageLocaleBase
 * @param {string} material
 * @returns {string|undefined}
 */
export function materialI18nKey(locale, pageLocaleBase, material) {
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

const NULLABLE_SUM_KEYS = ['obligationToMeet', 'outstanding']

/**
 * With `dashWhenNoData`, a total whose every input is null (NoDataYet) stays
 * null so the table shows a dash instead of 0.
 */
function sumRows(rows, { dashWhenNoData = false } = {}) {
  const totals = rows.reduce((acc, r) => {
    for (const k of SUM_KEYS) {
      acc[k] += r[k] ?? 0
    }
    return acc
  }, zeroTotals())

  if (dashWhenNoData) {
    for (const k of NULLABLE_SUM_KEYS) {
      if (rows.every((r) => r[k] == null)) {
        totals[k] = null
      }
    }
  }

  return totals
}

/** Match packaging: NoDataYet / missing values use null so the table can announce "Not available yet". */
function nullableTonnage(value, status) {
  if (status === 'NoDataYet' || value == null) {
    return null
  }

  return Number(value)
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
    obligationToMeet: nullableTonnage(tonnages?.obligated, status),
    awaitingAcceptance: Number(tonnages?.awaitingAcceptance ?? 0),
    accepted: Number(tonnages?.accepted ?? 0),
    outstanding: nullableTonnage(tonnages?.outstanding, status),
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

function aggregateGlassRow(glassDataRows, locale, pageLocaleBase, sumOptions) {
  const status = deriveOverallStatus(glassDataRows)

  return {
    material: 'GlassAggregate',
    materialKey: obligationsTableKey(
      locale,
      pageLocaleBase,
      GLASS_AGGREGATE_KEY_SUFFIX
    ),
    ...sumRows(glassDataRows, sumOptions),
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
  { locale = 'en', pageLocaleBase = null, dashWhenNoData = false } = {}
) {
  const list = obligations ?? []
  const sumOptions = { dashWhenNoData }

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
    aggregateGlassRow(glassDataRows, locale, pageLocaleBase, sumOptions)
  )
  mainMaterialRows.sort(compareMaterialRows)

  const overallStatus = deriveOverallStatus(mainMaterialRows)
  const obligationsRows = [
    ...mainMaterialRows,
    totalsRow(
      overallStatus,
      sumRows(mainMaterialRows, sumOptions),
      locale,
      pageLocaleBase
    )
  ]

  const glassOverall = deriveOverallStatus(glassDataRows)
  const glassRows = [
    ...glassDataRows,
    totalsRow(
      glassOverall,
      sumRows(glassDataRows, sumOptions),
      locale,
      pageLocaleBase
    )
  ]

  return { overallStatus, obligationsRows, glassRows }
}
