import { describe, expect, test } from 'vitest'

import { isHealthAllTokenValid } from './access.js'

describe('isHealthAllTokenValid', () => {
  test('accepts an exact non-empty token match', () => {
    expect(isHealthAllTokenValid('health-token', 'health-token')).toBe(true)
  })

  test('rejects an absent or mismatched token', () => {
    expect(isHealthAllTokenValid(undefined, 'health-token')).toBe(false)
    expect(isHealthAllTokenValid('different-token', 'health-token')).toBe(false)
    expect(isHealthAllTokenValid('', '')).toBe(false)
  })
})
