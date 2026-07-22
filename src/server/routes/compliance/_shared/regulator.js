import { translate } from '#/server/common/helpers/i18n/translate.js'

export const DEFAULT_BUSINESS_COUNTRY = 'GB-ENG'

const REGULATORS = {
  'GB-ENG': {
    name: 'Environment Agency',
    email: 'packagingproducers@environment-agency.gov.uk'
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

function resolveCountryCode(businessCountry) {
  return businessCountry in REGULATORS
    ? businessCountry
    : DEFAULT_BUSINESS_COUNTRY
}

function withTrailingSpace(value) {
  return value ? `${value} ` : ''
}

function regulatorArticle(country, locale) {
  return withTrailingSpace(
    translate(locale, `compliance.regulators.${country}.the`)
  )
}

export function getRegulatorDetails(businessCountry, locale = 'en') {
  const country = resolveCountryCode(businessCountry)
  const regulator = REGULATORS[country]

  return {
    name: regulator.name,
    the: regulatorArticle(country, locale),
    email: regulator.email
  }
}

export function getRegulatorDetailsByName(name, locale = 'en') {
  const country =
    Object.entries(REGULATORS).find(
      ([, regulator]) => regulator.name === name
    )?.[0] ?? DEFAULT_BUSINESS_COUNTRY

  return getRegulatorDetails(country, locale)
}
