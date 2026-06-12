import { describe, expect, test } from 'vitest'

import { pickLatestDeclarationForYear } from './compliance-declaration.js'

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

  test('picks the latest declaration by updated timestamp', () => {
    const older = {
      id: 'older',
      obligationYear: 2026,
      created: '2026-01-01T10:00:00Z',
      updated: '2026-01-15T10:00:00Z'
    }
    const newer = {
      id: 'newer',
      obligationYear: 2026,
      created: '2026-01-01T10:00:00Z',
      updated: '2026-02-01T10:00:00Z'
    }

    expect(pickLatestDeclarationForYear([older, newer], 2026)).toMatchObject({
      id: 'newer'
    })
  })

  test('falls back to created when updated is missing', () => {
    const older = {
      id: 'older',
      obligationYear: 2026,
      created: '2026-01-01T10:00:00Z'
    }
    const newer = {
      id: 'newer',
      obligationYear: 2026,
      created: '2026-03-01T10:00:00Z'
    }

    expect(pickLatestDeclarationForYear([older, newer], '2026')).toMatchObject({
      id: 'newer'
    })
  })

  test('prefers declarations with timestamps over undated rows', () => {
    const undated = {
      id: 'undated',
      obligationYear: 2026
    }
    const dated = {
      id: 'dated',
      obligationYear: 2026,
      created: '2026-02-01T10:00:00Z'
    }

    expect(pickLatestDeclarationForYear([undated, dated], 2026)).toMatchObject({
      id: 'dated'
    })
  })
})
