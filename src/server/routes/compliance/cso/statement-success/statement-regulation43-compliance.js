import { resolveComponentLocaleKey } from '#/server/common/helpers/i18n/translate.js'

export function isStatementRegulation43Compliant(declaration) {
  return (
    declaration?.obligationStatus === 'Met' &&
    declaration?.isRegulation43Compliant === true
  )
}

export function statementRegulation43ComplianceI18nKey(
  declaration,
  locale = 'en'
) {
  const key = isStatementRegulation43Compliant(declaration)
    ? 'publicRegisterRegulation43Complied'
    : 'publicRegisterRegulation43NotComplied'

  return resolveComponentLocaleKey(
    locale,
    'compliance.statementSuccess',
    'success',
    key
  )
}
