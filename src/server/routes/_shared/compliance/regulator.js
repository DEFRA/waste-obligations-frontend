import { translate } from '#/server/common/helpers/i18n/translate.js'

export const DEFAULT_BUSINESS_COUNTRY = 'GB-ENG'

const REGULATORS = {
  'GB-ENG': {
    name: 'Environment Agency',
    key: 'obligations.home.regulatorEngland',
    email: 'packagingproducers@environment-agency.gov.uk'
  },
  'GB-SCT': {
    name: 'Scottish Environment Protection Agency',
    key: 'obligations.home.regulatorScotland',
    email: 'producer.responsibility@sepa.org.uk'
  },
  'GB-WLS': {
    name: 'Natural Resources Wales',
    key: 'obligations.home.regulatorWales',
    email: 'packaging@naturalresourceswales.gov.uk'
  },
  'GB-NIR': {
    name: 'Northern Ireland Environment Agency',
    key: 'obligations.home.regulatorNorthernIreland',
    email: 'packaging@daera-ni.gov.uk'
  }
}

function resolveCountryCode(businessCountry) {
  return businessCountry in REGULATORS
    ? businessCountry
    : DEFAULT_BUSINESS_COUNTRY
}

function nameWithArticle(country, name, locale, isStartSentence) {
  const article = translate(
    locale,
    isStartSentence
      ? `compliance.regulators.${country}.theStart`
      : `compliance.regulators.${country}.the`
  )

  return article ? `${article} ${name}` : name
}

export function getRegulatorDetails(
  businessCountry,
  locale = 'en',
  isStartSentence = false
) {
  const country = resolveCountryCode(businessCountry)
  const regulator = REGULATORS[country]

  return {
    name: translate(locale, regulator.key),
    nameWithArticle: nameWithArticle(
      country,
      translate(locale, regulator.key),
      locale,
      isStartSentence
    ),
    email: regulator.email
  }
}

export function getRegulatorDetailsByName(
  name,
  locale = 'en',
  isStartSentence = false
) {
  const country =
    Object.entries(REGULATORS).find(
      ([, regulator]) => regulator.name === name
    )?.[0] ?? DEFAULT_BUSINESS_COUNTRY

  return getRegulatorDetails(country, locale, isStartSentence)
}
