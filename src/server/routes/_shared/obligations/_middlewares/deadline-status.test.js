import { describe, test, expect } from 'vitest'

import { buildDeadlineStatus } from './deadline-status.js'

const organisation = { businessCountry: 'GB-ENG' }
const cancelledDeclaration = [
  { id: 'cancelled-1', obligationYear: 2026, status: 'Cancelled' }
]
const deadlineOpen = new Date('2027-01-31T23:30:00Z')
const deadlinePassed = new Date('2027-02-01T00:30:00Z')

function status(overrides = {}) {
  return buildDeadlineStatus({
    locale: 'en',
    isProducer: true,
    organisation,
    obligationYear: 2026,
    deadlineYear: 2027,
    declarations: [],
    submittedDeclaration: null,
    date: deadlineOpen,
    ...overrides
  })
}

const NONE = {
  cancelledSubmission: null,
  cancelledMissedDeadline: null,
  missedDeadline: null
}

describe('buildDeadlineStatus', () => {
  test('shows no tile once the year is submitted', () => {
    expect(
      status({ submittedDeclaration: { href: '/x' }, date: deadlinePassed })
    ).toEqual(NONE)
  })

  test('shows no deadline tile before the deadline when nothing was cancelled', () => {
    expect(status()).toEqual(NONE)
  })

  test('offers resubmission before the deadline when the year was cancelled', () => {
    const result = status({ declarations: cancelledDeclaration })

    expect(result.cancelledSubmission).toEqual({
      heading: expect.any(String),
      paragraph: expect.any(String),
      buttonLabel: expect.any(String)
    })
    expect(result.missedDeadline).toBeNull()
    expect(result.cancelledMissedDeadline).toBeNull()
  })

  test('shows the missed deadline copy after the deadline with no submission', () => {
    const result = status({ date: deadlinePassed })

    expect(result.missedDeadline).toEqual({
      heading: expect.any(String),
      paragraphPrefix: expect.any(String),
      paragraphSuffix: expect.any(String)
    })
    expect(result.cancelledSubmission).toBeNull()
    expect(result.cancelledMissedDeadline).toBeNull()
  })

  test('explains a cancelled year can no longer be resubmitted after the deadline', () => {
    const result = status({
      declarations: cancelledDeclaration,
      date: deadlinePassed
    })

    expect(result.cancelledMissedDeadline).toEqual({
      heading: expect.any(String),
      paragraphPrefix: expect.any(String),
      paragraphSuffix: expect.any(String)
    })
    expect(result.missedDeadline).toBeNull()
    expect(result.cancelledSubmission).toBeNull()
  })

  test('treats 31 January as still open and 1 February as passed', () => {
    expect(status({ date: deadlineOpen }).missedDeadline).toBeNull()
    expect(status({ date: deadlinePassed }).missedDeadline).not.toBeNull()
  })

  test('uses statement copy for a CSO, distinct from the producer copy', () => {
    const producer = status({ date: deadlinePassed, isProducer: true })
    const cso = status({ date: deadlinePassed, isProducer: false })

    expect(cso.missedDeadline.heading).not.toBe(producer.missedDeadline.heading)
  })
})
