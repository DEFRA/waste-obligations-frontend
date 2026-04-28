const REGULATOR_EMAILS = {
  england: 'packaging-producers@environment-agency.gov.uk',
  scotland: 'producer.responsibility@sepa.org.uk',
  wales: 'packaging@naturalresourceswales.gov.uk',
  'northern-ireland': 'packaging@daera-ni.gov.uk'
}

export function getRegulatorEmail(country = 'england') {
  return REGULATOR_EMAILS[country]
}
