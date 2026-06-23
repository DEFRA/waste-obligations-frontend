import { describe, expect, test } from 'vitest'

import {
  formatSubmissionDate,
  formatWholeTonnes,
  parseCertificateDeclarationApiText
} from './utils.js'

describe('parseCertificateDeclarationApiText', () => {
  test('parses intro and bullets from API text', () => {
    expect(
      parseCertificateDeclarationApiText(
        'By entering your name and submitting this certificate of compliance, you are verifying:\n*you are an approved person*the information is accurate*you understand enforcement action'
      )
    ).toEqual({
      intro:
        'By entering your name and submitting this certificate of compliance, you are verifying:',
      bullets: [
        'you are an approved person',
        'the information is accurate',
        'you understand enforcement action'
      ]
    })
  })

  test('returns empty bullets when only intro is present', () => {
    expect(parseCertificateDeclarationApiText('Intro only')).toEqual({
      intro: 'Intro only',
      bullets: []
    })
  })

  test('returns empty intro and bullets for null or blank text', () => {
    expect(parseCertificateDeclarationApiText(null)).toEqual({
      intro: '',
      bullets: []
    })
    expect(parseCertificateDeclarationApiText('')).toEqual({
      intro: '',
      bullets: []
    })
  })
})

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
