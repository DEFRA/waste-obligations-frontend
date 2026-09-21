import { translate } from '#/server/common/helpers/i18n/translate.js'

export const SELECTED_PRNS_FIELD_ID = 'selected-prns'

export function getSelectedPrnIds(payload = {}) {
  const value = payload.selectedPrnIds

  if (Array.isArray(value)) {
    return value.filter(Boolean)
  }

  if (typeof value === 'string' && value) {
    return [value]
  }

  return []
}

export function getSelectedPrnsFormErrors(selectedPrnIds, locale) {
  if (selectedPrnIds.length > 0) {
    return null
  }

  const message = translate(locale, 'prns.list.errors.selectOneOrMore')

  return {
    summary: [{ text: message, href: `#${SELECTED_PRNS_FIELD_ID}` }]
  }
}
