import { describe, expect, test } from 'vitest'

import {
  buildDecemberWasteFlash,
  canMultiSelectPrn,
  decemberWasteFlashText,
  isInDecemberJanuaryFlashWindow,
  isIssuedInImmediateDecemberJanuaryFlashWindow,
  resolveAvailableAcceptanceYears,
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

describe('isInDecemberJanuaryFlashWindow', () => {
  test.each([
    ['2026-12-15T12:00:00Z', true],
    ['2027-01-15T12:00:00Z', true],
    ['2026-06-15T12:00:00Z', false],
    ['2026-11-30T23:59:00Z', false],
    // Window edges. UK time is GMT in December and January, so UK midnight is
    // UTC midnight at both boundaries.
    ['2026-11-30T23:59:59Z', false],
    ['2026-12-01T00:00:00Z', true],
    ['2027-01-31T23:59:59Z', true],
    ['2027-02-01T00:00:00Z', false]
  ])('now=%s -> %s', (now, expected) => {
    expect(isInDecemberJanuaryFlashWindow(new Date(now))).toBe(expected)
  })
})

describe('isIssuedInImmediateDecemberJanuaryFlashWindow window edges', () => {
  test.each([
    // issued just before / at the start of the window, checked in December
    ['2026-11-30T23:59:59Z', '2026-12-15T12:00:00Z', false],
    ['2026-12-01T00:00:00Z', '2026-12-15T12:00:00Z', true],
    // issued at the very end of the window, checked that same minute
    ['2027-01-31T23:59:59Z', '2027-01-31T23:59:59Z', true],
    // issued at the start of the window, checked on its last day
    ['2026-12-01T00:00:00Z', '2027-01-31T23:59:59Z', true],
    // same PRN once the window has closed
    ['2026-12-01T00:00:00Z', '2027-02-01T00:00:00Z', false]
  ])('issuedAt=%s now=%s -> %s', (issuedAt, now, expected) => {
    expect(
      isIssuedInImmediateDecemberJanuaryFlashWindow(issuedAt, new Date(now))
    ).toBe(expected)
  })
})

describe('isIssuedInImmediateDecemberJanuaryFlashWindow', () => {
  test('is false when now is outside December/January', () => {
    expect(
      isIssuedInImmediateDecemberJanuaryFlashWindow(
        '2026-12-05',
        new Date('2026-06-15T12:00:00Z')
      )
    ).toBe(false)
  })

  test('is true for a December issue date in the same immediate window', () => {
    expect(
      isIssuedInImmediateDecemberJanuaryFlashWindow(
        '2026-12-05',
        new Date('2026-12-15T12:00:00Z')
      )
    ).toBe(true)
  })

  test('is true for a January issue date in the same immediate window', () => {
    expect(
      isIssuedInImmediateDecemberJanuaryFlashWindow(
        '2027-01-05',
        new Date('2027-01-20T12:00:00Z')
      )
    ).toBe(true)
  })

  test('is false for a prior year January issue date, even while now is in January', () => {
    expect(
      isIssuedInImmediateDecemberJanuaryFlashWindow(
        '2026-01-05',
        new Date('2027-01-20T12:00:00Z')
      )
    ).toBe(false)
  })

  test('is false when issuedAt is missing', () => {
    expect(
      isIssuedInImmediateDecemberJanuaryFlashWindow(
        undefined,
        new Date('2026-12-15T12:00:00Z')
      )
    ).toBe(false)
  })

  // The API schema only validates issuedAt as a string; an unparseable value
  // must hide the flash rather than throw inside the December/January window.
  test.each(['not-a-date', '2026-13-45'])(
    'is false when issuedAt %s is not a valid date',
    (issuedAt) => {
      expect(
        isIssuedInImmediateDecemberJanuaryFlashWindow(
          issuedAt,
          new Date('2026-12-15T12:00:00Z')
        )
      ).toBe(false)
    }
  )
})

describe('shouldShowDecemberWasteFlash', () => {
  const now = new Date('2026-12-15T12:00:00Z')

  test('is true for an awaiting-acceptance December waste PRN issued in the immediate window', () => {
    expect(
      shouldShowDecemberWasteFlash(
        {
          obligationYear: 2026,
          decemberWaste: true,
          status: 'AwaitingAcceptance',
          issuedAt: '2026-12-05'
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
          issuedAt: '2026-12-05'
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
          issuedAt: '2026-12-05'
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
          issuedAt: '2026-12-05'
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
          issuedAt: '2026-01-05'
        },
        { now: new Date('2027-01-20T12:00:00Z') }
      )
    ).toBe(false)
  })

  // MO-479 AC1: the flash is only for December waste with a choice of
  // obligation year. 2025 December waste offers a single year, so it gets no
  // flash even though it is awaiting acceptance inside its own window.
  test('is false for an in-window December waste PRN with a single acceptance year', () => {
    const singleYearPrn = {
      obligationYear: 2025,
      decemberWaste: true,
      status: 'AwaitingAcceptance',
      issuedAt: '2025-12-10'
    }
    const singleYearNow = new Date('2025-12-15T12:00:00Z')

    expect(
      resolveAvailableAcceptanceYears(singleYearPrn, { now: singleYearNow })
    ).toEqual([2025])
    expect(
      isIssuedInImmediateDecemberJanuaryFlashWindow(
        singleYearPrn.issuedAt,
        singleYearNow
      )
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
    issuedAt: '2026-12-05'
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
