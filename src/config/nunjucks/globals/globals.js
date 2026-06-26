import { translate } from '#/server/common/helpers/i18n/translate.js'
import { resolveComponentLocaleKey } from '#/server/common/helpers/i18n/component-locale-key.js'

// Pre-refresh GOV.UK branding for header, footer, and page chrome. Set true when adopting the rebrand.
const govukRebrand = false

function t(locale, key, params = {}) {
  return translate(locale, key, params)
}

function componentKey(locale, pageLocaleBase, componentName, key) {
  return resolveComponentLocaleKey(locale, pageLocaleBase, componentName, key)
}

export { govukRebrand, componentKey, t }
