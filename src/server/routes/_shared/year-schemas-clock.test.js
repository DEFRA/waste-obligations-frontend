import { describe, expect, test, vi } from 'vitest'

// The year schemas must follow the application clock (which honours
// STARTUP_UTC_TIMESTAMP_OVERRIDE on LOCAL), not the machine's real date.
// The machine date stays real here; only the application clock is shifted.
vi.mock('#/server/common/helpers/clock.js', () => ({
  now: () => new Date('2027-02-01T00:00:01Z')
}))

const { complianceQuerySchema } = await import('./compliance/schemas.js')
const { buildObligationsYearRule } =
  await import('./obligations/_middlewares/obligations-year-rule.js')
const { prnsQuerySchema } = await import('./prns/schema.js')

// At 1 Feb 2027 the compliance year is 2027, and next year (2028) cannot be
// chosen until December.
describe('year schemas follow the application clock', () => {
  test('a certificate can be requested for the clock compliance year, not the next', () => {
    expect(complianceQuerySchema.validate({ year: 2027 }).error).toBeUndefined()
    expect(complianceQuerySchema.validate({ year: 2028 }).error).toBeDefined()
  })

  test('the obligations pages show the clock compliance year, not the next', () => {
    const rule = buildObligationsYearRule({
      paramKey: 'organisationId',
      obligationsPath: (id, year) => `/obligations/${id}?year=${year}`,
      compliancePath: () => '/compliance'
    })
    const h = {
      continue: 'continue',
      redirect: vi.fn(() => ({ takeover: () => 'redirected' }))
    }
    const request = (year) => ({
      params: { organisationId: 'org' },
      query: { year }
    })

    expect(rule.method(request(2027), h)).toBe('continue')
    expect(rule.method(request(2028), h)).toBe('redirected')
    expect(h.redirect).toHaveBeenCalledWith('/obligations/org?year=2027')
  })

  test('the PRNs list accepts the clock compliance year, not the next, and defaults to the former', () => {
    expect(prnsQuerySchema.validate({ year: 2027 }).error).toBeUndefined()
    expect(prnsQuerySchema.validate({ year: 2028 }).error).toBeDefined()
    expect(prnsQuerySchema.validate({}).value.year).toBe(2027)
  })
})
