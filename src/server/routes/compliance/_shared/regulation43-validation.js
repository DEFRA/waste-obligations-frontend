import { translate } from '#/server/common/helpers/i18n/translate.js'

export const REGULATION_43_ERROR_KEY =
  'compliance.validation.regulation43.empty'
export const REGULATION_43_FIELD_NAME_KEY =
  'compliance.statementSubmit.regulation43Heading'

export function getRegulation43FormErrors(value, locale) {
  if (value === 'yes' || value === 'no') {
    return null
  }

  const fieldName = translate(locale, REGULATION_43_FIELD_NAME_KEY)
  const message = translate(locale, REGULATION_43_ERROR_KEY, { fieldName })

  return {
    summary: [{ text: message, href: '#regulation43Compliant' }],
    fields: { regulation43Compliant: message }
  }
}

export function isRegulation43Compliant(value) {
  return value === 'yes'
}
