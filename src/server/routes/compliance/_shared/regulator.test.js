import { getRegulatorDetails } from './regulator.js'

describe('getRegulatorDetails', () => {
  test('returns England regulator details by default', () => {
    expect(getRegulatorDetails()).toEqual({
      name: 'Environment Agency',
      email: 'packagingproducers@environment-agency.gov.uk'
    })
  })

  test('falls back to England for unknown country', () => {
    expect(getRegulatorDetails('unknown')).toEqual({
      name: 'Environment Agency',
      email: 'packagingproducers@environment-agency.gov.uk'
    })
  })

  test('maps API country code GB-ENG to England regulator details', () => {
    expect(getRegulatorDetails('GB-ENG')).toEqual({
      name: 'Environment Agency',
      email: 'packagingproducers@environment-agency.gov.uk'
    })
  })

  test('maps API country code GB-SCT to Scotland regulator details', () => {
    expect(getRegulatorDetails('GB-SCT')).toEqual({
      name: 'Scottish Environment Protection Agency',
      email: 'producer.responsibility@sepa.org.uk'
    })
  })

  test('maps API country code GB-WLS to Wales regulator details', () => {
    expect(getRegulatorDetails('GB-WLS')).toEqual({
      name: 'Natural Resources Wales',
      email: 'packaging@naturalresourceswales.gov.uk'
    })
  })

  test('maps API country code GB-NIR to Northern Ireland regulator details', () => {
    expect(getRegulatorDetails('GB-NIR')).toEqual({
      name: 'Northern Ireland Environment Agency',
      email: 'packaging@daera-ni.gov.uk'
    })
  })
})
