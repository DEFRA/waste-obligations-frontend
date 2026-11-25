import Boom from '@hapi/boom'
/**
 * Recycling targets (as fractions, like the API's) by material code and obligation year, set by
 * Schedule 5 of the Producer Responsibility Obligations (Packaging and
 * Packaging Waste) Regulations 2024.
 *
 * The material calculation pages show the target from this table for the
 * page's obligation year. The obligations API calculates obligations with its
 * own copy of these targets (waste-obligations, src/Api/appsettings.json,
 * ObligationCalculation:Targets), so the two must be kept in step: a year in
 * the API but not here shows the generic error page on the material pages.
 *
 * Material codes: PL plastic, PC paper or board, FC fibre-based composite
 * (paper, board and fibre-based composite share one target), AL aluminium,
 * ST steel, WD wood, GL glass, GR glass re-melt.
 *
 * 2028 to 2030 are from the 2024 Regulations as drafted; GOV.UK guidance
 * confirms targets only to 2027 (glass re-melt to 2030).
 */
export const MATERIAL_TARGETS = {
  PL: { 2026: 0.57, 2027: 0.59, 2028: 0.61, 2029: 0.63, 2030: 0.65 },
  PC: { 2026: 0.77, 2027: 0.79, 2028: 0.81, 2029: 0.83, 2030: 0.85 },
  FC: { 2026: 0.77, 2027: 0.79, 2028: 0.81, 2029: 0.83, 2030: 0.85 },
  AL: { 2026: 0.62, 2027: 0.63, 2028: 0.64, 2029: 0.65, 2030: 0.67 },
  ST: { 2026: 0.81, 2027: 0.82, 2028: 0.83, 2029: 0.84, 2030: 0.85 },
  WD: { 2026: 0.46, 2027: 0.47, 2028: 0.48, 2029: 0.49, 2030: 0.5 },
  GL: { 2026: 0.76, 2027: 0.78, 2028: 0.8, 2029: 0.82, 2030: 0.85 },
  GR: { 2026: 0.76, 2027: 0.77, 2028: 0.78, 2029: 0.79, 2030: 0.8 }
}

/**
 * The recycling target, as a fraction (0.62 is 62%), for a material and obligation year.
 * A year with no target is an error: another year's target is never reused.
 *
 * @param {string} materialCode - a key of MATERIAL_TARGETS, e.g. 'AL'
 * @param {number|string} year - the obligation year
 * @returns {number}
 */
export function getMaterialTarget(materialCode, year) {
  const target = Object.hasOwn(MATERIAL_TARGETS, materialCode)
    ? MATERIAL_TARGETS[materialCode][year]
    : undefined

  if (!Number.isFinite(target)) {
    throw Boom.internal(
      `No recycling target for material ${materialCode} in ${year}`
    )
  }

  return target
}
