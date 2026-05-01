import { getRegulatorEmail } from './regulator-email.js'

describe('getRegulatorEmail', () => {
  test('returns England regulator email by default', () => {
    expect(getRegulatorEmail()).toBe(
      'packaging-producers@environment-agency.gov.uk'
    )
  })

  test('falls back to England for unknown country', () => {
    expect(getRegulatorEmail('unknown')).toBe(
      'packaging-producers@environment-agency.gov.uk'
    )
  })

  test('maps API country code GB-ENG to England email', () => {
    expect(getRegulatorEmail('GB-ENG')).toBe(
      'packaging-producers@environment-agency.gov.uk'
    )
  })

  test('maps API country code GB-SCT to Scotland email', () => {
    expect(getRegulatorEmail('GB-SCT')).toBe(
      'producer.responsibility@sepa.org.uk'
    )
  })

  test('maps API country code GB-WLS to Wales email', () => {
    expect(getRegulatorEmail('GB-WLS')).toBe(
      'packaging@naturalresourceswales.gov.uk'
    )
  })

  test('maps API country code GB-NIR to Northern Ireland email', () => {
    expect(getRegulatorEmail('GB-NIR')).toBe('packaging@daera-ni.gov.uk')
  })
})
