import { describe, test, expect } from 'vitest'

import { resolveRegulatorDisplayName } from './regulator.js'

describe('resolveRegulatorDisplayName', () => {
  test('names a different regulator for each nation', () => {
    const names = ['GB-ENG', 'GB-SCT', 'GB-WLS', 'GB-NIR'].map((country) =>
      resolveRegulatorDisplayName(country, 'en')
    )

    names.forEach((name) => expect(name).toEqual(expect.any(String)))
    expect(new Set(names).size).toBe(4)
  })

  test('falls back to England for an unknown country', () => {
    expect(resolveRegulatorDisplayName('GB-XXX', 'en')).toBe(
      resolveRegulatorDisplayName('GB-ENG', 'en')
    )
  })

  test('falls back to England when the country is missing', () => {
    expect(resolveRegulatorDisplayName(undefined, 'en')).toBe(
      resolveRegulatorDisplayName('GB-ENG', 'en')
    )
  })
})
