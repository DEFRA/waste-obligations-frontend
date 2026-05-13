/** OpenAPI `Obligation.material` → i18n keys; unknown → `material.default`. */
const MATERIAL_I18N_KEYS = {
  Paper: 'compliance.certificateSubmit.material.paperComposite',
  Plastic: 'compliance.certificateSubmit.material.plastic',
  Wood: 'compliance.certificateSubmit.material.wood',
  Steel: 'compliance.certificateSubmit.material.steel',
  Aluminium: 'compliance.certificateSubmit.material.aluminium',
  GlassRemelt: 'compliance.certificateSubmit.material.glassRemelt',
  Glass: 'compliance.certificateSubmit.material.glassRemaining'
}

const TOTALS_I18N_KEY = 'compliance.certificateSubmit.table.totalsRow'

const STATUS_TAG = {
  met: {
    variant: 'green',
    i18nKey: 'compliance.certificateSubmit.obligationStatus.met'
  },
  not_met: {
    variant: 'red',
    i18nKey: 'compliance.certificateSubmit.obligationStatus.notMet'
  },
  no_data_yet: {
    variant: 'grey',
    i18nKey: 'compliance.certificateSubmit.obligationStatus.noDataYet'
  }
}

/** Met | NotMet | NoDataYet (+ spacing / case variants). Unknown → opaque token for `toTagStatus`. */
const CANONICAL = {
  met: 'met',
  notmet: 'not_met',
  not_met: 'not_met',
  nodatayet: 'no_data_yet',
  no_data_yet: 'no_data_yet'
}

function canonicalStatus(raw) {
  if (raw == null) {
    return 'no_data_yet'
  }
  const t = String(raw).trim()
  if (t === '') {
    return 'no_data_yet'
  }

  const compact = t.replace(/\s+/g, '').toLowerCase()

  if (CANONICAL[compact]) {
    return CANONICAL[compact]
  }

  const snake = t.toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_')
  return CANONICAL[snake] ?? snake
}

/** @param {unknown} raw */
export function normalizeObligationRowStatus(raw) {
  const c = canonicalStatus(raw)
  return c === 'met' || c === 'not_met' || c === 'no_data_yet'
    ? c
    : 'no_data_yet'
}

export function toTagStatus(raw) {
  const c = canonicalStatus(raw)
  const preset = STATUS_TAG[c]
  if (preset) return { variant: preset.variant, i18nKey: preset.i18nKey }
  const label = String(raw ?? '').trim()
  return {
    variant: 'grey',
    i18nKey: 'compliance.certificateSubmit.obligationStatus.other',
    i18nParams: { status: label || '—' }
  }
}

function materialI18n(code) {
  const materialKey = MATERIAL_I18N_KEYS[code]
  return materialKey
    ? { materialKey, materialParams: {} }
    : {
        materialKey: 'compliance.certificateSubmit.material.default',
        materialParams: { name: String(code ?? '').trim() }
      }
}

function deriveOverallStatus(rows) {
  return (rows ?? []).some(
    (r) => normalizeObligationRowStatus(r?.status) === 'not_met'
  )
    ? 'not_met'
    : 'met'
}

function mapApiObligationToRow(o) {
  const t = o?.tonnages ?? {}
  const status = normalizeObligationRowStatus(o?.status)
  return {
    ...materialI18n(o?.material ?? ''),
    obligationToMeet: Number(t.obligated ?? 0),
    awaitingAcceptance: Number(t.awaitingAcceptance ?? 0),
    accepted: Number(t.accepted ?? 0),
    outstanding: Number(t.outstanding ?? 0),
    status,
    tag: toTagStatus(o?.status)
  }
}

const SUM_KEYS = [
  'obligationToMeet',
  'awaitingAcceptance',
  'accepted',
  'outstanding'
]

function sumNumericRows(rows) {
  const z = () => Object.fromEntries(SUM_KEYS.map((k) => [k, 0]))
  return rows.reduce((acc, r) => {
    for (const k of SUM_KEYS) acc[k] += r[k]
    return acc
  }, z())
}

function glassRowFromApi(o, materialWhenMissing) {
  if (!o) {
    return {
      ...materialI18n(materialWhenMissing),
      ...Object.fromEntries(SUM_KEYS.map((k) => [k, 0])),
      status: 'met',
      tag: toTagStatus('Met')
    }
  }
  return mapApiObligationToRow(o)
}

function totalsRow(overallStatus, totals) {
  return {
    materialKey: TOTALS_I18N_KEY,
    materialParams: {},
    ...totals,
    status: overallStatus,
    tag: toTagStatus(overallStatus === 'met' ? 'Met' : 'NotMet')
  }
}

/**
 * @param {import('#/server/services/types/waste-obligations-api.types.js').WasteObligationsOrganisationObligations|null|undefined} payload
 * @returns {{ overallStatus: 'met'|'not_met', obligationsRows: object[], glassRows: object[] }}
 */
export function presentObligationsForCertificateSubmit(payload) {
  const list = payload?.obligations ?? []
  const mainRows = list
    .filter((o) => o?.material !== 'GlassRemelt')
    .map(mapApiObligationToRow)
  const totals = sumNumericRows(mainRows)
  const overallStatus = deriveOverallStatus(mainRows)
  const obligationsRows = [...mainRows, totalsRow(overallStatus, totals)]

  const glassDataRows = [
    glassRowFromApi(
      list.find((o) => o?.material === 'GlassRemelt'),
      'GlassRemelt'
    ),
    glassRowFromApi(
      list.find((o) => o?.material === 'Glass'),
      'Glass'
    )
  ]
  const glassTotals = sumNumericRows(glassDataRows)
  const glassOverall = deriveOverallStatus(glassDataRows)
  const glassRows = [...glassDataRows, totalsRow(glassOverall, glassTotals)]

  return { overallStatus, obligationsRows, glassRows }
}

export function toComplianceDeclarationObligationStatus(overallStatus) {
  return overallStatus === 'not_met' ? 'NotMet' : 'Met'
}

const SUCCESS_LABEL = { met: 'Met', not_met: 'Not met' }

export function formatCertificateObligationStatusForView(raw) {
  return SUCCESS_LABEL[normalizeObligationRowStatus(raw)] ?? ''
}

const DEFAULT_DECLARATION_TEXT =
  'I confirm that the organisation has met its producer responsibility obligations for the stated obligation year, to the best of my knowledge and belief.'

/**
 * @param {object} p
 * @param {import('#/server/services/types/waste-organisations-api.types.js').WasteOrganisationsOrganisation|null|undefined} [p.organisation]
 * @param {string} p.organisationId
 * @param {number} p.obligationYear
 * @param {import('#/server/services/types/waste-obligations-api.types.js').WasteObligationsObligation[]} p.obligations
 * @param {import('#/server/services/types/waste-obligations-api.types.js').WasteObligationsDeclarationObligationStatus} p.obligationStatus
 * @param {string} p.fullName
 * @param {import('#/server/services/types/waste-obligations-api.types.js').WasteObligationsUser} p.user
 * @returns {import('#/server/services/types/waste-obligations-api.types.js').WasteObligationsCreateComplianceDeclarationRequest}
 */
export function buildCreateComplianceDeclarationPayload({
  organisation,
  organisationId,
  obligationYear,
  obligations,
  obligationStatus,
  fullName,
  user
}) {
  const id = organisation?.id ?? organisationId
  return {
    organisation: {
      id,
      name: organisation?.name ?? null,
      complianceSchemeName: organisation?.tradingName ?? null,
      schemeOperatorName: null,
      referenceNumber: organisation?.companiesHouseNumber ?? null,
      address: organisation?.address ?? null,
      regulator: null
    },
    obligationYear,
    obligations: obligations ?? [],
    obligationStatus,
    declarationText: { text: DEFAULT_DECLARATION_TEXT, language: 'en' },
    submitterName: fullName.trim(),
    user
  }
}
