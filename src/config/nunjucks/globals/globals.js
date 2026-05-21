import { translate } from '#/server/common/helpers/i18n/translate.js'

// Pre-refresh GOV.UK branding for header, footer, and page chrome. Set true when adopting the rebrand.
const govukRebrand = false

function t(locale, key, params = {}) {
  return translate(locale, key, params)
}

export { govukRebrand, t }
