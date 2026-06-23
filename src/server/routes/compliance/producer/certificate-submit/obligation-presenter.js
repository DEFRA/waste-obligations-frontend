const MATERIAL_I18N_KEYS = {
  Paper: 'compliance.certificateSubmit.material.paperComposite',
  Plastic: 'compliance.certificateSubmit.material.plastic',
  Wood: 'compliance.certificateSubmit.material.wood',
  Steel: 'compliance.certificateSubmit.material.steel',
  Aluminium: 'compliance.certificateSubmit.material.aluminium',
  GlassRemelt: 'compliance.certificateSubmit.material.glassRemelt'
}

const GLASS_AGGREGATE_I18N_KEY = 'compliance.certificateSubmit.material.glass'
const GLASS_REMAINING_I18N_KEY =
  'compliance.certificateSubmit.material.glassRemaining'

function materialI18nKey(material) {
  if (material === 'Glass') {
    return GLASS_REMAINING_I18N_KEY
  }

  return MATERIAL_I18N_KEYS[material]
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

const TOTALS_I18N_KEY = 'compliance.certificateSubmit.table.totalsRow'

const STATUS_TAG = {
  Met: {
    variant: 'green',
    i18nKey: 'compliance.certificateSubmit.obligationStatus.met'
  },
  NotMet: {
    variant: 'yellow',
    i18nKey: 'compliance.certificateSubmit.obligationStatus.notMet'
  },
  NoDataYet: {
    variant: 'grey',
    i18nKey: 'compliance.certificateSubmit.obligationStatus.noDataYet'
  }
}

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

function toRow(obligation) {
  const tonnages = obligation.tonnages
  const status = obligation.status
  const material = obligation.material

  return {
    material,
    materialKey: materialI18nKey(material),
    obligationToMeet: Number(tonnages.obligated ?? 0),
    awaitingAcceptance: Number(tonnages.awaitingAcceptance ?? 0),
    accepted: Number(tonnages.accepted ?? 0),
    outstanding: Number(tonnages.outstanding ?? 0),
    status,
    tag: STATUS_TAG[status]
  }
}

function glassRow(obligations, material) {
  const found = obligations.find(
    (obligation) => obligation.material === material
  )

  if (found) {
    return toRow(found)
  }

  return {
    material,
    materialKey: materialI18nKey(material),
    ...zeroTotals(),
    status: 'Met',
    tag: STATUS_TAG.Met
  }
}

function aggregateGlassRow(glassDataRows) {
  const status = deriveOverallStatus(glassDataRows)

  return {
    material: 'GlassAggregate',
    materialKey: GLASS_AGGREGATE_I18N_KEY,
    ...sumRows(glassDataRows),
    status,
    tag: STATUS_TAG[status]
  }
}

function totalsRow(overallStatus, totals) {
  return {
    material: 'Totals',
    isTotals: true,
    materialKey: TOTALS_I18N_KEY,
    ...totals,
    status: overallStatus,
    tag: STATUS_TAG[overallStatus]
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

export function presentObligationsForCertificateSubmit(obligations) {
  const list = obligations ?? []

  const glassDataRows = GLASS_BREAKDOWN_MATERIALS.map((material) =>
    glassRow(list, material)
  ).sort(compareMaterialRows)

  const mainMaterialRows = list
    .filter(
      (obligation) => !MAIN_TABLE_EXCLUDED_MATERIALS.has(obligation.material)
    )
    .map(toRow)
    .sort(compareMaterialRows)

  mainMaterialRows.push(aggregateGlassRow(glassDataRows))
  mainMaterialRows.sort(compareMaterialRows)

  const overallStatus = deriveOverallStatus(mainMaterialRows)
  const obligationsRows = [
    ...mainMaterialRows,
    totalsRow(overallStatus, sumRows(mainMaterialRows))
  ]

  const glassOverall = deriveOverallStatus(glassDataRows)
  const glassRows = [
    ...glassDataRows,
    totalsRow(glassOverall, sumRows(glassDataRows))
  ]

  return { overallStatus, obligationsRows, glassRows }
}

export function obligationStatusI18nKey(raw) {
  return raw === 'Met' || raw === 'NotMet' ? STATUS_TAG[raw].i18nKey : null
}
