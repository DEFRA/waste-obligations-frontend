import { getRegulatorEmail } from './regulator-email.js'

describe('getRegulatorEmail', () => {
  test('returns England regulator email by default', () => {
    expect(getRegulatorEmail()).toBe(
      'packaging-producers@environment-agency.gov.uk'
    )
  })

  test('returns Scotland regulator email', () => {
    expect(getRegulatorEmail('scotland')).toBe(
      'producer.responsibility@sepa.org.uk'
    )
  })

  test('returns Wales regulator email', () => {
    expect(getRegulatorEmail('wales')).toBe(
      'packaging@naturalresourceswales.gov.uk'
    )
  })

  test('returns Northern Ireland regulator email', () => {
    expect(getRegulatorEmail('northern-ireland')).toBe(
      'packaging@daera-ni.gov.uk'
    )
  })
})
