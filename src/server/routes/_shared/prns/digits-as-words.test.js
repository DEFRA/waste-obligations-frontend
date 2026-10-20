import { describe, expect, test } from 'vitest'

import { digitsAsWords } from './digits-as-words.js'

describe('digitsAsWords', () => {
  test.each([
    [0, 'Zero'],
    [1, 'One'],
    [9, 'Nine'],
    [75, 'Seven Five'],
    [123, 'One Two Three'],
    [1000, 'One Zero Zero Zero']
  ])('spells %i as %s', (value, expected) => {
    expect(digitsAsWords(value)).toBe(expected)
  })

  test.each([
    undefined,
    null,
    true,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    -1,
    1.5,
    '75',
    {}
  ])('returns an empty string for %s', (value) => {
    expect(digitsAsWords(value)).toBe('')
  })
})
