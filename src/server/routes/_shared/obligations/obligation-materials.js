const MATERIAL_SLUGS = {
  Aluminium: 'aluminium',
  Glass: 'glass',
  GlassRemelt: 'glass',
  GlassAggregate: 'glass',
  Paper: 'paper',
  Plastic: 'plastic',
  Steel: 'steel',
  Wood: 'wood'
}

/** The materials that have a calculation page: glass covers re-melt and remaining glass. */
export const OBLIGATION_MATERIAL_SLUGS = [
  'aluminium',
  'glass',
  'paper',
  'plastic',
  'steel',
  'wood'
]

/**
 * The calculation page for an obligation row's material, or undefined for a
 * row with no page (the totals row).
 *
 * @param {string} material
 * @returns {string|undefined}
 */
export function obligationMaterialSlug(material) {
  return MATERIAL_SLUGS[material]
}

const ARIA_LABEL_KEYS = {
  Aluminium: 'aluminium',
  Glass: 'remainingGlass',
  GlassRemelt: 'glassRemelt',
  GlassAggregate: 'glass',
  Paper: 'paper',
  Plastic: 'plastic',
  Steel: 'steel',
  Wood: 'wood'
}

/**
 * The key, under obligations.material.ariaLabels, of the text that names a
 * row's link for screen readers. In the glass breakdown 'Glass' is the
 * remaining glass; in the main table 'GlassAggregate' is glass as a whole.
 *
 * @param {string} material
 * @returns {string|undefined}
 */
export function obligationMaterialAriaLabelKey(material) {
  return ARIA_LABEL_KEYS[material]
}
