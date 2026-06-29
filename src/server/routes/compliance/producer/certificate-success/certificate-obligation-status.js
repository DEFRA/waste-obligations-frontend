import { resolveComponentLocaleKey } from '#/server/common/helpers/i18n/translate.js'

export function certificateObligationStatusI18nKey(declaration, locale = 'en') {
  const key =
    declaration?.obligationStatus === 'Met'
      ? 'publicRegisterBullet1Met'
      : 'publicRegisterBullet1NotMet'

  return resolveComponentLocaleKey(
    locale,
    'compliance.certificateSuccess',
    'success',
    key
  )
}
