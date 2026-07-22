import { getRegulatorDetails, getRegulatorDetailsByName } from './regulator.js'

describe('getRegulatorDetails', () => {
  test('returns England regulator details by default', () => {
    expect(getRegulatorDetails()).toEqual({
      name: 'Environment Agency',
      the: 'the ',
      email: 'packagingproducers@environment-agency.gov.uk'
    })
  })

  test('falls back to England for unknown country', () => {
    expect(getRegulatorDetails('unknown')).toEqual({
      name: 'Environment Agency',
      the: 'the ',
      email: 'packagingproducers@environment-agency.gov.uk'
    })
  })

  test('maps API country code GB-ENG to England regulator details', () => {
    expect(getRegulatorDetails('GB-ENG')).toEqual({
      name: 'Environment Agency',
      the: 'the ',
      email: 'packagingproducers@environment-agency.gov.uk'
    })
  })

  test('maps API country code GB-SCT to Scotland regulator details', () => {
    expect(getRegulatorDetails('GB-SCT')).toEqual({
      name: 'Scottish Environment Protection Agency',
      the: 'the ',
      email: 'producer.responsibility@sepa.org.uk'
    })
  })

  test('maps API country code GB-WLS to Wales with empty article', () => {
    expect(getRegulatorDetails('GB-WLS')).toEqual({
      name: 'Natural Resources Wales',
      the: '',
      email: 'packaging@naturalresourceswales.gov.uk'
    })
  })

  test('maps API country code GB-NIR to Northern Ireland regulator details', () => {
    expect(getRegulatorDetails('GB-NIR')).toEqual({
      name: 'Northern Ireland Environment Agency',
      the: 'the ',
      email: 'packaging@daera-ni.gov.uk'
    })
  })
})

describe('getRegulatorDetailsByName', () => {
  test('resolves article from a stored bare regulator name', () => {
    expect(getRegulatorDetailsByName('Natural Resources Wales')).toEqual({
      name: 'Natural Resources Wales',
      the: '',
      email: 'packaging@naturalresourceswales.gov.uk'
    })
  })

  test('falls back to England for an unknown bare name', () => {
    expect(getRegulatorDetailsByName('Unknown Regulator').name).toBe(
      'Environment Agency'
    )
  })
})
