import { getObligationYear } from './year.js'

describe('getObligationYear', () => {
  test('returns parsed year from query when valid', () => {
    const year = getObligationYear({
      query: {
        year: '2024'
      }
    })

    expect(year).toBe(2024)
  })

  test('returns default year when query year is missing', () => {
    const expectedDefaultYear = new Date().getFullYear() - 1

    const year = getObligationYear({
      query: {}
    })

    expect(year).toBe(expectedDefaultYear)
  })

  test('returns default year when query year is invalid', () => {
    const expectedDefaultYear = new Date().getFullYear() - 1

    const year = getObligationYear({
      query: {
        year: 'not-a-year'
      }
    })

    expect(year).toBe(expectedDefaultYear)
  })

  test('returns default year when query year is out of range', () => {
    const expectedDefaultYear = new Date().getFullYear() - 1

    const year = getObligationYear({
      query: {
        year: '1800'
      }
    })

    expect(year).toBe(expectedDefaultYear)
  })
})
