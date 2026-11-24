import { describe, expect, test } from 'vitest'

import { resolvePrnPageYears, resolvePrnYear } from './resolve-prn-year.js'

describe('resolvePrnYear', () => {
  test('the PRN obligation year always wins over the query year', () => {
    expect(resolvePrnYear(2023, { obligationYear: 2024 })).toBe(2024)
  })

  test('uses the query year when the PRN has no obligation year', () => {
    expect(resolvePrnYear(2023, {})).toBe(2023)
  })

  test('returns undefined when neither year is available', () => {
    expect(resolvePrnYear(undefined, {})).toBeUndefined()
  })
})

describe('resolvePrnPageYears', () => {
  test('keeps the chosen year for the buttons and the note year for display', () => {
    expect(
      resolvePrnPageYears(
        { year: 2026 },
        { obligationYear: 2025, status: 'Rejected' }
      )
    ).toEqual({
      year: 2025,
      chosenYear: 2026,
      obligationsYear: 2026,
      isAcceptanceConfirmation: false,
      isRejectionConfirmation: false
    })
  })

  test('opens the year accepted into straight after an acceptance', () => {
    expect(
      resolvePrnPageYears(
        { year: 2026, confirmed: '1' },
        { obligationYear: 2027, status: 'Accepted' }
      )
    ).toMatchObject({
      chosenYear: 2026,
      obligationsYear: 2027,
      isAcceptanceConfirmation: true
    })
  })

  test('keeps the chosen year straight after a rejection', () => {
    expect(
      resolvePrnPageYears(
        { year: 2026, confirmed: '1' },
        { obligationYear: 2025, status: 'Rejected' }
      )
    ).toMatchObject({ obligationsYear: 2026, isRejectionConfirmation: true })
  })

  test("uses the note's own year when no year was chosen", () => {
    expect(
      resolvePrnPageYears({}, { obligationYear: 2025, status: 'Accepted' })
    ).toMatchObject({ chosenYear: 2025, obligationsYear: 2025 })
  })
})
