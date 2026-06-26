export function isStatementRegulation43Compliant(declaration) {
  return (
    declaration?.obligationStatus === 'Met' &&
    declaration?.isRegulation43Compliant === true
  )
}

export function statementRegulation43ComplianceI18nKey(declaration) {
  return isStatementRegulation43Compliant(declaration)
    ? 'compliance.statementSuccess.publicRegisterRegulation43Complied'
    : 'compliance.statementSuccess.publicRegisterRegulation43NotComplied'
}
