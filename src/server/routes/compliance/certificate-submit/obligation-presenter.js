const MATERIAL_I18N_KEYS = {
  Paper: 'compliance.certificateSubmit.material.paperComposite',
  Plastic: 'compliance.certificateSubmit.material.plastic',
  Wood: 'compliance.certificateSubmit.material.wood',
  Steel: 'compliance.certificateSubmit.material.steel',
  Aluminum: 'compliance.certificateSubmit.material.aluminum',
  GlassRemelt: 'compliance.certificateSubmit.material.glassRemelt',
  Glass: 'compliance.certificateSubmit.material.glassRemaining'
}

const TOTALS_I18N_KEY = 'compliance.certificateSubmit.table.totalsRow'

const STATUS_TAG = {
  Met: {
    variant: 'green',
    i18nKey: 'compliance.certificateSubmit.obligationStatus.met'
  },
  NotMet: {
    variant: 'red',
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
    for (const k of SUM_KEYS) acc[k] += r[k]
    return acc
  }, zeroTotals())
}

function toRow(o) {
  const t = o.tonnages
  const status = o.status

  return {
    materialKey: MATERIAL_I18N_KEYS[o?.material],
    obligationToMeet: Number(t.obligated ?? 0),
    awaitingAcceptance: Number(t.awaitingAcceptance ?? 0),
    accepted: Number(t.accepted ?? 0),
    outstanding: Number(t.outstanding ?? 0),
    status,
    tag: STATUS_TAG[status]
  }
}

function glassRow(list, material) {
  const found = list.find((o) => o?.material === material)

  return found
    ? toRow(found)
    : {
        materialKey: MATERIAL_I18N_KEYS[material],
        ...zeroTotals(),
        status: 'Met',
        tag: STATUS_TAG.Met
      }
}

function totalsRow(overallStatus, totals) {
  return {
    materialKey: TOTALS_I18N_KEY,
    ...totals,
    status: overallStatus,
    tag: STATUS_TAG[overallStatus]
  }
}

function deriveOverallStatus(rows) {
  return rows.some((r) => r.status === 'NotMet') ? 'NotMet' : 'Met'
}

export function presentObligationsForCertificateSubmit(payload) {
  const list = payload?.obligations ?? []

  const mainRows = list.filter((o) => o?.material !== 'GlassRemelt').map(toRow)
  const overallStatus = deriveOverallStatus(mainRows)
  const obligationsRows = [
    ...mainRows,
    totalsRow(overallStatus, sumRows(mainRows))
  ]

  const glassDataRows = [glassRow(list, 'GlassRemelt'), glassRow(list, 'Glass')]
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
