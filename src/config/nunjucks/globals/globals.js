import {
  pageI18n as createPageI18n,
  translate
} from '#/server/common/helpers/i18n/translate.js'

// Pre-refresh GOV.UK branding for header, footer, and page chrome. Set true when adopting the rebrand.
const govukRebrand = false

function t(locale, key, params = {}) {
  return translate(locale, key, params)
}

function pageI18n(locale, pageLocaleBase) {
  return createPageI18n(locale, pageLocaleBase)
}

export { govukRebrand, pageI18n, t }
