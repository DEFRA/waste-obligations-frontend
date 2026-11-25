import {
  MATERIAL_TARGETS,
  getMaterialTarget
} from '#/config/material-targets.js'

describe('getMaterialTarget', () => {
  test.each([
    ['AL', 2026, 0.62],
    ['AL', 2027, 0.63],
    ['WD', 2026, 0.46],
    ['PL', 2027, 0.59],
    ['PC', 2028, 0.81],
    ['FC', 2028, 0.81],
    ['ST', 2030, 0.85],
    ['GL', 2027, 0.78],
    ['GR', 2027, 0.77]
  ])('returns the %s target for %i as %s', (code, year, expected) => {
    expect(getMaterialTarget(code, year)).toBe(expected)
  })

  test('accepts the year as a string', () => {
    expect(getMaterialTarget('AL', '2026')).toBe(0.62)
  })

  test.each([
    ['a year with no target', 'AL', 2031],
    ['a year before the first target', 'AL', 2025],
    ['an unknown material code', 'XX', 2026],
    ['a prototype property as a material code', 'constructor', 2026],
    ['no year', 'AL', undefined]
  ])('throws for %s', (_label, code, year) => {
    expect(() => getMaterialTarget(code, year)).toThrow(
      'No recycling target for material'
    )
  })

  test('never reuses another year when a year has no target', () => {
    expect(() => getMaterialTarget('AL', 2031)).toThrow()
  })
})

describe('MATERIAL_TARGETS', () => {
  test('gives every material the same years', () => {
    const years = Object.values(MATERIAL_TARGETS).map((byYear) =>
      Object.keys(byYear).join()
    )

    expect(new Set(years).size).toBe(1)
  })

  test('shares one target between paper, board and fibre-based composite', () => {
    expect(MATERIAL_TARGETS.PC).toEqual(MATERIAL_TARGETS.FC)
  })
})
