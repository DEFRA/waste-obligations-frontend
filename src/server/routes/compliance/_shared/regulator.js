export const DEFAULT_BUSINESS_COUNTRY = 'GB-ENG'

const REGULATORS = {
  'GB-ENG': {
    name: 'Environment Agency',
    email: 'packaging-producers@environment-agency.gov.uk'
  },
  'GB-SCT': {
    name: 'Scottish Environment Protection Agency',
    email: 'producer.responsibility@sepa.org.uk'
  },
  'GB-WLS': {
    name: 'Natural Resources Wales',
    email: 'packaging@naturalresourceswales.gov.uk'
  },
  'GB-NIR': {
    name: 'Northern Ireland Environment Agency',
    email: 'packaging@daera-ni.gov.uk'
  }
}

export function getRegulatorDetails(businessCountry) {
  return REGULATORS[businessCountry] ?? REGULATORS[DEFAULT_BUSINESS_COUNTRY]
}
