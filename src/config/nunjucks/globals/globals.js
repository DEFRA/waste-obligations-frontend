import {
  resolveComponentLocaleKey,
  translate,
  translateComponent
} from '#/server/common/helpers/i18n/translate.js'

// Pre-refresh GOV.UK branding for header, footer, and page chrome. Set true when adopting the rebrand.
const govukRebrand = false

function t(locale, key, params = {}) {
  return translate(locale, key, params)
}

function componentLocaleKey(locale, pageLocaleBase, componentName, key) {
  return resolveComponentLocaleKey(locale, pageLocaleBase, componentName, key)
}

function componentT(locale, pageLocaleBase, componentName, key, params = {}) {
  return translateComponent(locale, pageLocaleBase, componentName, key, params)
}

export { govukRebrand, componentLocaleKey, componentT, t }
