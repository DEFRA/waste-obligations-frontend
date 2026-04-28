const REGULATOR_EMAILS = {
  'GB-ENG': 'packaging-producers@environment-agency.gov.uk',
  'GB-SCT': 'producer.responsibility@sepa.org.uk',
  'GB-WLS': 'packaging@naturalresourceswales.gov.uk',
  'GB-NIR': 'packaging@daera-ni.gov.uk'
}

export const DEFAULT_BUSINESS_COUNTRY = 'GB-ENG'

export function getRegulatorEmail(businessCountry) {
  return (
    REGULATOR_EMAILS[businessCountry] ??
    REGULATOR_EMAILS[DEFAULT_BUSINESS_COUNTRY]
  )
}
