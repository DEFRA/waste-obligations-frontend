const COMPLIANCE_STATUS_VARIANTS = {
  met: 'met',
  notMet: 'not-met'
}

const COMPLIANCE_STATUS_KEYS = {
  metComplied: {
    variant: COMPLIANCE_STATUS_VARIANTS.met,
    straplineKey: 'obligationsMetCompliedStrapline',
    subtextKey: 'obligationsMetCompliedSubtext'
  },
  metNotComplied: {
    variant: COMPLIANCE_STATUS_VARIANTS.notMet,
    straplineKey: 'notCompliantReg43Strapline',
    subtextKey: 'obligationsMetReg43NotCompliedSubtext'
  },
  notMetComplied: {
    variant: COMPLIANCE_STATUS_VARIANTS.notMet,
    straplineKey: 'notCompliantReg43Strapline',
    subtextKey: 'obligationsNotMetReg43CompliedSubtext'
  },
  notMetNotComplied: {
    variant: COMPLIANCE_STATUS_VARIANTS.notMet,
    straplineKey: 'notCompliantReg43Strapline',
    subtextKey: 'obligationsNotMetReg43NotCompliedSubtext'
  }
}

export function resolveStatementComplianceStatus(declaration) {
  const obligationsMet = declaration?.obligationStatus === 'Met'
  const regulation43Compliant = declaration?.isRegulation43Compliant === true

  if (obligationsMet && regulation43Compliant) {
    return COMPLIANCE_STATUS_KEYS.metComplied
  }

  if (obligationsMet && !regulation43Compliant) {
    return COMPLIANCE_STATUS_KEYS.metNotComplied
  }

  if (!obligationsMet && regulation43Compliant) {
    return COMPLIANCE_STATUS_KEYS.notMetComplied
  }

  return COMPLIANCE_STATUS_KEYS.notMetNotComplied
}
