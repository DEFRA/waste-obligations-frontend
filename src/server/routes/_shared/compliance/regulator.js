import { translate } from '#/server/common/helpers/i18n/translate.js'

export const DEFAULT_BUSINESS_COUNTRY = 'GB-ENG'

const REGULATORS = {
  'GB-ENG': {
    name: 'Environment Agency',
    key: 'compliance.regulators.GB-ENG.name',
    email: 'packagingproducers@environment-agency.gov.uk'
  },
  'GB-SCT': {
    name: 'Scottish Environment Protection Agency',
    key: 'compliance.regulators.GB-SCT.name',
    email: 'producer.responsibility@sepa.org.uk'
  },
  'GB-WLS': {
    name: 'Natural Resources Wales',
    key: 'compliance.regulators.GB-WLS.name',
    email: 'packaging@naturalresourceswales.gov.uk'
  },
  'GB-NIR': {
    name: 'Northern Ireland Environment Agency',
    key: 'compliance.regulators.GB-NIR.name',
    email: 'packaging@daera-ni.gov.uk'
  }
}

// The nation ids the account service gives a compliance scheme, as the
// Packaging service's Nation enum numbers them.
const COUNTRY_BY_NATION_ID = {
  1: 'GB-ENG',
  2: 'GB-NIR',
  3: 'GB-SCT',
  4: 'GB-WLS'
}

/**
 * The business country for a nation id, or undefined for an id that is not
 * set or not known.
 *
 * @param {number|null|undefined} nationId
 * @returns {string|undefined}
 */
export function countryFromNationId(nationId) {
  return COUNTRY_BY_NATION_ID[nationId]
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
