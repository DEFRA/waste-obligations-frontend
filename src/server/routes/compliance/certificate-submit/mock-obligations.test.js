import { describe, expect, test } from 'vitest'

import { getMockObligations, toTagStatus } from './mock-obligations.js'

describe('getMockObligations', () => {
  test('met overall: all material rows met and totals row ends with Met tag', () => {
    const { overallStatus, obligationsRows, glassRows } = getMockObligations({
      overall: 'met'
    })

    expect(overallStatus).toBe('met')

    const paper = obligationsRows.find(
      (r) => r.material === 'Paper, board or fibre-based composite material'
    )
    expect(paper).toMatchObject({
      obligationToMeet: 9860,
      awaitingAcceptance: 0,
      accepted: 9860,
      outstanding: 0,
      status: 'met',
      tag: { text: 'Met', variant: 'green' }
    })

    const totals = obligationsRows.at(-1)
    expect(totals?.material).toBe('Totals')
    expect(totals?.tag).toEqual({ text: 'Met', variant: 'green' })

    expect(glassRows).toHaveLength(3)
    expect(glassRows.at(-1)?.material).toBe('Totals')
  })

  test('not_met overall: paper and wood not met, overall not_met, totals tag reflects overall', () => {
    const { overallStatus, obligationsRows } = getMockObligations({
      overall: 'not_met'
    })

    expect(overallStatus).toBe('not_met')

    const paper = obligationsRows.find(
      (r) => r.material === 'Paper, board or fibre-based composite material'
    )
    expect(paper).toMatchObject({
      awaitingAcceptance: 2000,
      accepted: 5860,
      outstanding: 4000,
      status: 'not_met',
      tag: { text: 'Not met', variant: 'red' }
    })

    const wood = obligationsRows.find((r) => r.material === 'Wood')
    expect(wood).toMatchObject({
      obligationToMeet: 7946,
      outstanding: 7946,
      status: 'not_met',
      tag: { text: 'Not met', variant: 'red' }
    })

    const totals = obligationsRows.at(-1)
    expect(totals?.tag).toEqual({ text: 'Not met', variant: 'red' })
  })

  test('default overall is met', () => {
    const { overallStatus } = getMockObligations()
    expect(overallStatus).toBe('met')
  })
})

describe('toTagStatus', () => {
  test.each([
    ['met', { text: 'Met', variant: 'green' }],
    ['MET', { text: 'Met', variant: 'green' }],
    ['not met', { text: 'Not met', variant: 'red' }],
    ['not_met', { text: 'Not met', variant: 'red' }],
    ['not-met', { text: 'Not met', variant: 'red' }]
  ])('maps %s to expected tag', (input, expected) => {
    expect(toTagStatus(input)).toEqual(expected)
  })

  test('maps unknown status to grey with original label', () => {
    expect(toTagStatus('Pending')).toEqual({
      text: 'Pending',
      variant: 'grey'
    })
  })

  test('maps empty status to No data yet', () => {
    expect(toTagStatus('')).toEqual({
      text: 'No data yet',
      variant: 'grey'
    })
    expect(toTagStatus(null)).toEqual({
      text: 'No data yet',
      variant: 'grey'
    })
  })
})
