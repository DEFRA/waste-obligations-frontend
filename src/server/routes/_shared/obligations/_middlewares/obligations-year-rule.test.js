import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { buildObligationsYearRule } from './obligations-year-rule.js'

const id = 'b6f76437-65b6-4ed2-a7d5-c50e9af76201'

describe('buildObligationsYearRule', () => {
  const rule = buildObligationsYearRule({
    paramKey: 'organisationId',
    obligationsPath: (orgId, year) =>
      `/producer/${orgId}/obligations?year=${year}`,
    compliancePath: (orgId, year) =>
      `/producer/${orgId}/compliance/certificate?year=${year}`
  })

  function buildH() {
    const takeover = vi.fn(() => 'taken over')
    return {
      continue: Symbol('continue'),
      redirect: vi.fn(() => ({ takeover }))
    }
  }

  function run(year) {
    const h = buildH()
    const result = rule.method(
      { params: { organisationId: id }, query: { year } },
      h
    )

    return { h, result }
  }

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-12-15T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  test.each([2027, 2026])('lets %i through when it can be chosen', (year) => {
    const { h, result } = run(year)

    expect(result).toBe(h.continue)
    expect(h.redirect).not.toHaveBeenCalled()
  })

  test.each([2025, 2024, 2023, 1999])(
    'sends %i to the compliance page for 2025',
    (year) => {
      const { h, result } = run(year)

      expect(h.redirect).toHaveBeenCalledWith(
        `/producer/${id}/compliance/certificate?year=2025`
      )
      expect(result).toBe('taken over')
    }
  )

  test.each([2028, 2100])(
    'sends %i, a year beyond the next one, to the current year',
    (year) => {
      const { h } = run(year)

      expect(h.redirect).toHaveBeenCalledWith(
        `/producer/${id}/obligations?year=2026`
      )
    }
  )

  test('sends next year to the current year outside December and January', () => {
    vi.setSystemTime(new Date('2026-11-15T12:00:00Z'))

    const { h } = run(2027)

    expect(h.redirect).toHaveBeenCalledWith(
      `/producer/${id}/obligations?year=2026`
    )
  })

  test('lets next year through in January, when it is still next year', () => {
    vi.setSystemTime(new Date('2027-01-15T12:00:00Z'))

    const { h, result } = run(2027)

    expect(result).toBe(h.continue)
  })

  test('sends the year after next to the current year in January', () => {
    vi.setSystemTime(new Date('2027-01-15T12:00:00Z'))

    const { h } = run(2028)

    expect(h.redirect).toHaveBeenCalledWith(
      `/producer/${id}/obligations?year=2026`
    )
  })
})

describe('buildObligationsYearRule paths', () => {
  test('gives the request to the path builders, so a page can keep part of its own path', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-15T12:00:00Z'))

    const rule = buildObligationsYearRule({
      paramKey: 'organisationId',
      obligationsPath: (orgId, year, request) =>
        `/producer/${orgId}/obligations/${request.params.material}?year=${year}`,
      compliancePath: (orgId, year, request) =>
        `/producer/${orgId}/compliance/${request.params.material}?year=${year}`
    })
    const takeover = vi.fn()
    const h = {
      continue: Symbol('continue'),
      redirect: vi.fn(() => ({ takeover }))
    }
    const request = {
      params: { organisationId: id, material: 'plastic' },
      query: { year: 2027 }
    }

    rule.method(request, h)
    rule.method({ ...request, query: { year: 2025 } }, h)

    expect(h.redirect).toHaveBeenNthCalledWith(
      1,
      `/producer/${id}/obligations/plastic?year=2026`
    )
    expect(h.redirect).toHaveBeenNthCalledWith(
      2,
      `/producer/${id}/compliance/plastic?year=2025`
    )

    vi.useRealTimers()
  })
})
