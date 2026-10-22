import { describe, expect, test, vi } from 'vitest'

// The year schemas must follow the application clock (which honours
// STARTUP_UTC_TIMESTAMP_OVERRIDE on LOCAL), not the machine's real date.
// The machine date stays real here; only the application clock is shifted.
vi.mock('#/server/common/helpers/clock.js', () => ({
  now: () => new Date('2027-02-01T00:00:01Z')
}))

const { complianceQuerySchema } = await import('./compliance/schemas.js')
const { obligationsQuerySchema } = await import('./obligations/schema.js')
const { prnsQuerySchema } = await import('./prns/schema.js')

// At 1 Feb 2027 the compliance year is 2027, so the next year is 2028.
describe('year schemas follow the application clock', () => {
  test('a certificate can be requested for the clock compliance year, not the next', () => {
    expect(complianceQuerySchema.validate({ year: 2027 }).error).toBeUndefined()
    expect(complianceQuerySchema.validate({ year: 2028 }).error).toBeDefined()
  })

  test('the obligations page accepts the clock compliance year and the next', () => {
    expect(
      obligationsQuerySchema.validate({ year: 2028 }).error
    ).toBeUndefined()
    expect(obligationsQuerySchema.validate({ year: 2029 }).error).toBeDefined()
  })

  test('the PRNs list accepts the clock compliance year and the next, and defaults to the former', () => {
    expect(prnsQuerySchema.validate({ year: 2028 }).error).toBeUndefined()
    expect(prnsQuerySchema.validate({ year: 2029 }).error).toBeDefined()
    expect(prnsQuerySchema.validate({}).value.year).toBe(2027)
  })
})
