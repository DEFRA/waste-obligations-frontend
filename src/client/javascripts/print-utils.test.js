import { describe, expect, test } from 'vitest'
import {
  padTwoDigits,
  formatPrintTimestamp,
  sanitizeFilenamePart,
  sanitizeOrganisationNameForFilename
} from './print-utils.js'

describe('padTwoDigits', () => {
  test('pads a single digit with a leading zero', () => {
    expect(padTwoDigits(7)).toBe('07')
  })

  test('leaves a two-digit value unchanged', () => {
    expect(padTwoDigits(23)).toBe('23')
  })

  test('handles zero', () => {
    expect(padTwoDigits(0)).toBe('00')
  })
})

describe('formatPrintTimestamp', () => {
  test('formats as DDMMYY-HHMMSS', () => {
    expect(formatPrintTimestamp(new Date('2026-07-08T09:46:55'))).toBe(
      '080726-094655'
    )
  })

  test('pads single-digit day, month, hours, minutes and seconds', () => {
    expect(formatPrintTimestamp(new Date('2026-01-02T03:04:05'))).toBe(
      '020126-030405'
    )
  })

  test('truncates the year to its last two digits', () => {
    expect(formatPrintTimestamp(new Date('2099-12-31T23:59:59'))).toBe(
      '311299-235959'
    )
  })
})

describe('sanitizeFilenamePart', () => {
  test('removes characters that are invalid in filenames', () => {
    expect(sanitizeFilenamePart('Acme/Corp: Ltd?')).toBe('AcmeCorp Ltd')
  })

  test('trims surrounding whitespace', () => {
    expect(sanitizeFilenamePart('  Acme Ltd  ')).toBe('Acme Ltd')
  })

  test('returns an empty string for null or undefined', () => {
    expect(sanitizeFilenamePart(null)).toBe('')
    expect(sanitizeFilenamePart(undefined)).toBe('')
  })

  test('coerces non-string values to a string', () => {
    expect(sanitizeFilenamePart(2026)).toBe('2026')
  })
})

describe('sanitizeOrganisationNameForFilename', () => {
  test('replaces spaces with underscores', () => {
    expect(sanitizeOrganisationNameForFilename('Example Operator Ltd')).toBe(
      'Example_Operator_Ltd'
    )
  })

  test('collapses runs of whitespace into a single underscore', () => {
    expect(sanitizeOrganisationNameForFilename('Example   Operator')).toBe(
      'Example_Operator'
    )
  })

  test('removes invalid filename characters before replacing spaces', () => {
    expect(sanitizeOrganisationNameForFilename('Acme/Corp: Ltd?')).toBe(
      'AcmeCorp_Ltd'
    )
  })
})
