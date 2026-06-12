import { translate } from '#/server/common/helpers/i18n/translate.js'

/** Mirrors govuk/components/tag output for use in govukTable html cells. */
const VARIANT_CLASS = {
  green: 'govuk-tag--green',
  yellow: 'govuk-tag--yellow',
  red: 'govuk-tag--red',
  grey: 'govuk-tag--grey'
}

export function renderObligationStatusTagHtml(locale, tag) {
  if (!tag?.i18nKey) {
    return ''
  }

  const text = translate(locale, tag.i18nKey, tag.i18nParams ?? {})
  const variantClass = VARIANT_CLASS[tag.variant] ?? VARIANT_CLASS.grey

  return `<strong class="govuk-tag ${variantClass}">${text}</strong>`
}
