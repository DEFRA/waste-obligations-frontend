import { describe, expect, test, vi } from 'vitest'

// The machine date stays real. Only the application clock is shifted, which
// is what STARTUP_UTC_TIMESTAMP_OVERRIDE does on LOCAL.
vi.mock('#/server/common/helpers/clock.js', () => ({
  now: () => new Date('2027-02-01T00:00:01Z')
}))

const { canMultiSelectPrn, resolveAvailableAcceptanceYears } =
  await import('./available-acceptance-years.js')
const { buildPrnsViewModel } = await import('./view-models/prns-view-model.js')

describe('acceptance years follow the application clock by default', () => {
  test('a note omitted from the call is judged against the clock', () => {
    expect(
      resolveAvailableAcceptanceYears({
        obligationYear: 2026,
        decemberWaste: false
      })
    ).toEqual([])
    expect(
      canMultiSelectPrn({ obligationYear: 2027, decemberWaste: false })
    ).toBe(true)
  })

  test('the list view model uses the same clock when no date is passed', () => {
    const model = buildPrnsViewModel({
      prns: [
        {
          id: 'standard-2026',
          number: 'STD',
          status: 'AwaitingAcceptance',
          obligationYear: 2026,
          decemberWaste: false
        }
      ],
      pathId: 'org-1',
      userType: 'producer'
    })

    expect(model.rows[0].canMultiSelect).toBe(false)
  })
})
