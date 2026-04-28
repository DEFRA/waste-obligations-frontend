const REGULATOR_EMAILS = {
  england: 'packaging-producers@environment-agency.gov.uk',
  scotland: 'producer.responsibility@sepa.org.uk',
  wales: 'packaging@naturalresourceswales.gov.uk',
  'northern-ireland': 'packaging@daera-ni.gov.uk'
}

function normaliseCountry(country) {
  return String(country ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
}

export function getRegulatorEmail(country = 'england') {
  const key = normaliseCountry(country)
  return REGULATOR_EMAILS[key] ?? REGULATOR_EMAILS.england
}
