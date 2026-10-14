import { describe, expect, test } from 'vitest'

import {
  buildDecemberWasteFlash,
  canMultiSelectPrn,
  decemberWasteFlashText,
  isDecemberWasteWindow,
  resolveAvailableAcceptanceYears,
  resolveSelectionAcceptanceYear,
  shouldShowDecemberWasteFlash
} from './available-acceptance-years.js'

describe('resolveAvailableAcceptanceYears', () => {
  test('returns empty when obligation year is missing', () => {
    expect(resolveAvailableAcceptanceYears({})).toEqual([])
  })

  test('returns the PRN year when it matches the current compliance year', () => {
    expect(
      resolveAvailableAcceptanceYears(
        { obligationYear: 2026, decemberWaste: false },
        { now: new Date('2026-06-01T12:00:00Z') }
      )
    ).toEqual([2026])
  })

  test('returns empty for an expired non-December PRN', () => {
    expect(
      resolveAvailableAcceptanceYears(
        { obligationYear: 2025, decemberWaste: false },
        { now: new Date('2026-06-01T12:00:00Z') }
      )
    ).toEqual([])
  })

  test('offers both years for December waste inside the choice window', () => {
    expect(
      resolveAvailableAcceptanceYears(
        { obligationYear: 2026, decemberWaste: true },
        { now: new Date('2026-12-15T12:00:00Z') }
      )
    ).toEqual([2026, 2027])
  })

  // The choice closes at UK midnight on 1 February. UK time is GMT then, so
  // UK midnight is UTC midnight.
  test.each([
    ['2027-01-31T23:59:59.999Z', [2026, 2027]],
    ['2027-02-01T00:00:00.000Z', [2027]]
  ])(
    'December waste at the 1 February choice cutoff: now=%s -> %j',
    (now, expected) => {
      expect(
        resolveAvailableAcceptanceYears(
          { obligationYear: 2026, decemberWaste: true },
          { now: new Date(now) }
        )
      ).toEqual(expected)
    }
  )

  test('offers only the next year for December waste after the choice window', () => {
    expect(
      resolveAvailableAcceptanceYears(
        { obligationYear: 2026, decemberWaste: true },
        { now: new Date('2027-03-01T12:00:00Z') }
      )
    ).toEqual([2027])
  })

  test('2025 December waste never offers a year choice', () => {
    expect(
      resolveAvailableAcceptanceYears(
        { obligationYear: 2025, decemberWaste: true },
        { now: new Date('2025-12-15T12:00:00Z') }
      )
    ).toEqual([2025])
  })

  test('returns empty for a future obligation year', () => {
    expect(
      resolveAvailableAcceptanceYears(
        { obligationYear: 2027, decemberWaste: false },
        { now: new Date('2026-06-01T12:00:00Z') }
      )
    ).toEqual([])
  })

  test('returns empty for a non-integer obligation year', () => {
    expect(
      resolveAvailableAcceptanceYears(
        { obligationYear: 2026.5, decemberWaste: false },
        { now: new Date('2026-06-01T12:00:00Z') }
      )
    ).toEqual([])
  })

  test('2025 December waste uses the current compliance year in 2026', () => {
    expect(
      resolveAvailableAcceptanceYears(
        { obligationYear: 2025, decemberWaste: true },
        { now: new Date('2026-06-01T12:00:00Z') }
      )
    ).toEqual([2026])
  })

  test('returns empty for expired 2025 December waste', () => {
    expect(
      resolveAvailableAcceptanceYears(
        { obligationYear: 2025, decemberWaste: true },
        { now: new Date('2027-02-01T12:00:00Z') }
      )
    ).toEqual([])
  })

  test('returns empty for expired 2026 December waste after the next compliance year', () => {
    expect(
      resolveAvailableAcceptanceYears(
        { obligationYear: 2026, decemberWaste: true },
        { now: new Date('2028-02-01T12:00:00Z') }
      )
    ).toEqual([])
  })

  test('keeps a standard PRN selectable through January of the following calendar year', () => {
    expect(
      resolveAvailableAcceptanceYears(
        { obligationYear: 2025, decemberWaste: false },
        { now: new Date('2026-01-15T12:00:00Z') }
      )
    ).toEqual([2025])
  })
})

describe('resolveSelectionAcceptanceYear', () => {
  const june2026 = { now: new Date('2026-06-01T12:00:00Z') }
  const february2027 = { now: new Date('2027-02-15T12:00:00Z') }

  test('is the year standard PRNs in the current compliance year are accepted into', () => {
    expect(
      resolveSelectionAcceptanceYear(
        [
          { obligationYear: 2026, decemberWaste: false },
          { obligationYear: 2026, decemberWaste: false }
        ],
        june2026
      )
    ).toBe(2026)
  })

  test('is the following year for December waste past its choice window', () => {
    expect(
      resolveSelectionAcceptanceYear(
        [
          { obligationYear: 2026, decemberWaste: true },
          { obligationYear: 2027, decemberWaste: false }
        ],
        february2027
      )
    ).toBe(2027)
  })

  test.each([
    ['no PRNs', []],
    [
      'a PRN offering a choice of years',
      [{ obligationYear: 2026, decemberWaste: true }]
    ],
    [
      'a PRN with no acceptance year',
      [{ obligationYear: 2025, decemberWaste: false }]
    ]
  ])('is undefined for %s', (_label, prns) => {
    expect(
      resolveSelectionAcceptanceYear(prns, {
        now: new Date('2026-12-15T12:00:00Z')
      })
    ).toBeUndefined()
  })

  test('never resolves a standard PRN to the year after its own', () => {
    // In February 2027 a 2026 December waste PRN resolves to 2027, but a
    // standard 2026 PRN cannot be accepted at all, so the selection has no year.
    expect(
      resolveSelectionAcceptanceYear(
        [{ obligationYear: 2026, decemberWaste: true }],
        february2027
      )
    ).toBe(2027)
    expect(
      resolveSelectionAcceptanceYear(
        [
          { obligationYear: 2026, decemberWaste: true },
          { obligationYear: 2026, decemberWaste: false }
        ],
        february2027
      )
    ).toBeUndefined()
  })

  test('is undefined when the PRNs resolve to different years', () => {
    expect(
      resolveSelectionAcceptanceYear(
        [
          { obligationYear: 2026, decemberWaste: false },
          { obligationYear: 2027, decemberWaste: false }
        ],
        june2026
      )
    ).toBeUndefined()
  })
})

describe('canMultiSelectPrn', () => {
  test('is true for a standard PRN in the current compliance year', () => {
    expect(
      canMultiSelectPrn(
        { obligationYear: 2026, decemberWaste: false },
        { now: new Date('2026-06-01T12:00:00Z') }
      )
    ).toBe(true)
  })

  test('is false for December waste with a multi-year choice', () => {
    expect(
      canMultiSelectPrn(
        { obligationYear: 2026, decemberWaste: true },
        { now: new Date('2026-12-15T12:00:00Z') }
      )
    ).toBe(false)
  })

  test.each([
    ['2027-01-31T23:59:59.999Z', false],
    ['2027-02-01T00:00:00.000Z', true]
  ])(
    'December waste at the 1 February choice cutoff: now=%s -> %s',
    (now, expected) => {
      expect(
        canMultiSelectPrn(
          { obligationYear: 2026, decemberWaste: true },
          { now: new Date(now) }
        )
      ).toBe(expected)
    }
  )

  test('is true for December waste with a single available year', () => {
    expect(
      canMultiSelectPrn(
        { obligationYear: 2026, decemberWaste: true },
        { now: new Date('2027-03-01T12:00:00Z') }
      )
    ).toBe(true)
  })

  test('is true for 2025 December waste, which never offers a year choice', () => {
    expect(
      canMultiSelectPrn(
        { obligationYear: 2025, decemberWaste: true },
        { now: new Date('2025-12-15T12:00:00Z') }
      )
    ).toBe(true)
  })

  test('is false for an expired standard PRN', () => {
    expect(
      canMultiSelectPrn(
        { obligationYear: 2025, decemberWaste: false },
        { now: new Date('2026-06-01T12:00:00Z') }
      )
    ).toBe(false)
  })
})

describe('isDecemberWasteWindow', () => {
  test.each([
    // December: the accreditation year is the current year
    [2026, '2026-12-15T12:00:00Z', true],
    [2025, '2026-12-15T12:00:00Z', false],
    [2027, '2026-12-15T12:00:00Z', false],
    // January: the accreditation year is the previous year
    [2026, '2027-01-15T12:00:00Z', true],
    [2027, '2027-01-15T12:00:00Z', false],
    [2025, '2027-01-15T12:00:00Z', false],
    // Outside December/January
    [2026, '2026-06-15T12:00:00Z', false],
    // Window edges. UK time is GMT in December and January, so UK midnight is
    // UTC midnight at both boundaries.
    [2026, '2026-11-30T23:59:59Z', false],
    [2026, '2026-12-01T00:00:00Z', true],
    [2026, '2027-01-31T23:59:59Z', true],
    [2026, '2027-02-01T00:00:00Z', false],
    // Only a number matches: the API sends the year as a number, and the
    // comparison is strict, so a numeric string is not the same year
    ['2026', '2026-12-15T12:00:00Z', false]
  ])(
    'accreditationYear=%s now=%s -> %s',
    (accreditationYear, now, expected) => {
      expect(isDecemberWasteWindow(accreditationYear, new Date(now))).toBe(
        expected
      )
    }
  )

  // The API sends a number, but the schema doesn't require it. A missing or
  // non-year value must hide the flash rather than throw.
  test.each([undefined, null, '', 'not-a-year', 2026.5])(
    'is false when accreditationYear is %s',
    (accreditationYear) => {
      expect(
        isDecemberWasteWindow(
          accreditationYear,
          new Date('2026-12-15T12:00:00Z')
        )
      ).toBe(false)
    }
  )
})

describe('shouldShowDecemberWasteFlash', () => {
  const now = new Date('2026-12-15T12:00:00Z')

  test('is true for an awaiting-acceptance December waste PRN in its accreditation year window', () => {
    expect(
      shouldShowDecemberWasteFlash(
        {
          obligationYear: 2026,
          decemberWaste: true,
          status: 'AwaitingAcceptance',
          accreditationYear: 2026
        },
        { now }
      )
    ).toBe(true)
  })

  test('is false when the PRN is not December waste', () => {
    expect(
      shouldShowDecemberWasteFlash(
        {
          obligationYear: 2026,
          decemberWaste: false,
          status: 'AwaitingAcceptance',
          accreditationYear: 2026
        },
        { now }
      )
    ).toBe(false)
  })

  test('is false once the PRN has been accepted', () => {
    expect(
      shouldShowDecemberWasteFlash(
        {
          obligationYear: 2026,
          decemberWaste: true,
          status: 'Accepted',
          accreditationYear: 2026
        },
        { now }
      )
    ).toBe(false)
  })

  test('is false outside the immediate Dec/Jan flash window', () => {
    expect(
      shouldShowDecemberWasteFlash(
        {
          obligationYear: 2026,
          decemberWaste: true,
          status: 'AwaitingAcceptance',
          accreditationYear: 2026
        },
        { now: new Date('2027-03-01T12:00:00Z') }
      )
    ).toBe(false)
  })

  test('is false for a stale prior-year January PRN', () => {
    expect(
      shouldShowDecemberWasteFlash(
        {
          obligationYear: 2025,
          decemberWaste: true,
          status: 'AwaitingAcceptance',
          accreditationYear: 2025
        },
        { now: new Date('2027-01-20T12:00:00Z') }
      )
    ).toBe(false)
  })

  // These PRNs offer a choice of two years, so only the accreditation-year
  // check can hide the flash.
  test.each([
    ['missing', undefined],
    ['invalid', 'not-a-year'],
    ['for an earlier window', 2025]
  ])(
    'is false with two acceptance years when the accreditation year is %s',
    (_, accreditationYear) => {
      const prn = {
        obligationYear: 2026,
        decemberWaste: true,
        status: 'AwaitingAcceptance',
        accreditationYear
      }

      expect(resolveAvailableAcceptanceYears(prn, { now })).toEqual([
        2026, 2027
      ])
      expect(shouldShowDecemberWasteFlash(prn, { now })).toBe(false)
    }
  )

  // MO-479 AC1: the flash is only for December waste with a choice of
  // obligation year. 2025 December waste offers a single year, so it gets no
  // flash even though it is awaiting acceptance inside its own window.
  test('is false for an in-window December waste PRN with a single acceptance year', () => {
    const singleYearPrn = {
      obligationYear: 2025,
      decemberWaste: true,
      status: 'AwaitingAcceptance',
      accreditationYear: 2025
    }
    const singleYearNow = new Date('2025-12-15T12:00:00Z')

    expect(
      resolveAvailableAcceptanceYears(singleYearPrn, { now: singleYearNow })
    ).toEqual([2025])
    expect(
      isDecemberWasteWindow(singleYearPrn.accreditationYear, singleYearNow)
    ).toBe(true)
    expect(
      shouldShowDecemberWasteFlash(singleYearPrn, { now: singleYearNow })
    ).toBe(false)
  })
})

describe('decemberWasteFlashText', () => {
  test('returns empty text for zero available years', () => {
    expect(decemberWasteFlashText('en', [])).toBe('')
  })

  test('formats two available years without merging the placeholders', () => {
    expect(decemberWasteFlashText('en', [2026, 2027])).toBe(
      'Can be accepted towards 2026 or 2027'
    )
  })
})

describe('buildDecemberWasteFlash', () => {
  const now = new Date('2026-12-15T12:00:00Z')
  const prn = {
    obligationYear: 2026,
    decemberWaste: true,
    status: 'AwaitingAcceptance',
    accreditationYear: 2026
  }

  test('shows the two-year text for an in-window awaiting December waste PRN', () => {
    expect(buildDecemberWasteFlash(prn, 'en', { now })).toEqual({
      show: true,
      text: 'Can be accepted towards 2026 or 2027'
    })
  })

  test('hides the flash, with no text, once the PRN has been accepted', () => {
    expect(
      buildDecemberWasteFlash({ ...prn, status: 'Accepted' }, 'en', { now })
    ).toEqual({ show: false, text: '' })
  })

  test('hides the flash, with no text, outside the December/January window', () => {
    expect(
      buildDecemberWasteFlash(prn, 'en', {
        now: new Date('2026-06-15T12:00:00Z')
      })
    ).toEqual({ show: false, text: '' })
  })
})
