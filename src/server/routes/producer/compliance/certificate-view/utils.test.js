import { describe, expect, test } from 'vitest'

import { formatSubmissionDate, formatWholeTonnes } from './utils.js'

describe('formatSubmissionDate', () => {
  test('formats ISO timestamps as DD Month YYYY', () => {
    expect(formatSubmissionDate('2026-04-02T14:00:00+00:00')).toBe(
      '2 April 2026'
    )
  })

  test('formats Date objects', () => {
    expect(formatSubmissionDate(new Date('2026-04-02T14:00:00Z'))).toBe(
      '2 April 2026'
    )
  })

  test('returns empty string for null or blank values', () => {
    expect(formatSubmissionDate(null)).toBe('')
    expect(formatSubmissionDate('')).toBe('')
  })
})

describe('formatWholeTonnes', () => {
  test('formats whole numbers with grouping', () => {
    expect(formatWholeTonnes(9860)).toBe('9,860')
  })

  test('treats nullish values as zero', () => {
    expect(formatWholeTonnes(null)).toBe('0')
    expect(formatWholeTonnes(undefined)).toBe('0')
  })
})
