import { describe, expect, test } from 'vitest'

import {
  pickLatestDeclarationForYear,
  pickLatestSubmittedDeclarationForYear
} from './compliance-declaration.js'

describe('pickLatestDeclarationForYear', () => {
  test('returns null when declarations are missing or empty', () => {
    expect(pickLatestDeclarationForYear(null, 2026)).toBeNull()
    expect(pickLatestDeclarationForYear(undefined, 2026)).toBeNull()
    expect(pickLatestDeclarationForYear([], 2026)).toBeNull()
  })

  test('returns null when no declaration matches the year', () => {
    expect(
      pickLatestDeclarationForYear(
        [{ obligationYear: 2025, created: '2025-01-01T00:00:00Z' }],
        2026
      )
    ).toBeNull()
  })

  test('returns the first declaration for the year from backend-sorted data', () => {
    const latest = {
      id: 'latest',
      obligationYear: 2026,
      updated: '2026-02-01T10:00:00Z'
    }
    const older = {
      id: 'older',
      obligationYear: 2026,
      updated: '2026-01-15T10:00:00Z'
    }

    expect(pickLatestDeclarationForYear([latest, older], 2026)).toMatchObject({
      id: 'latest'
    })
  })

  test('coerces year query values to numbers', () => {
    expect(
      pickLatestDeclarationForYear(
        [{ id: 'match', obligationYear: 2026 }],
        '2026'
      )
    ).toMatchObject({ id: 'match' })
  })
})

describe('pickLatestSubmittedDeclarationForYear', () => {
  test('returns the first submitted declaration for the year', () => {
    const latestSubmitted = {
      id: 'latest-submitted',
      obligationYear: 2026,
      status: 'Submitted'
    }
    const cancelled = {
      id: 'cancelled',
      obligationYear: 2026,
      status: 'Cancelled'
    }

    expect(
      pickLatestSubmittedDeclarationForYear([latestSubmitted, cancelled], 2026)
    ).toMatchObject({ id: 'latest-submitted' })
  })

  test('returns null when no submitted declaration exists for the year', () => {
    expect(
      pickLatestSubmittedDeclarationForYear(
        [{ obligationYear: 2026, status: 'Cancelled' }],
        2026
      )
    ).toBeNull()
  })
})
