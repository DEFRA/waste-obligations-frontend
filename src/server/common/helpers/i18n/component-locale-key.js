import { hasLocaleKey } from './translate.js'

export const COMPLIANCE_COMPONENT_LOCALE = {
  summaryList: 'compliance.components.summaryList',
  regulatorInset: 'compliance.components.regulatorInset',
  overallStatus: 'compliance.components.overallStatus',
  obligationsTable: 'compliance.components.obligationsTable',
  declaration: 'compliance.components.declaration',
  success: 'compliance.components.success',
  about: 'compliance.components.about'
}

export function resolveComponentLocaleKey(
  locale,
  pageLocaleBase,
  componentName,
  key
) {
  const pageKey = pageLocaleBase
    ? `${pageLocaleBase}.components.${componentName}.${key}`
    : null

  if (pageKey && hasLocaleKey(locale, pageKey)) {
    return pageKey
  }

  const componentBase = COMPLIANCE_COMPONENT_LOCALE[componentName]
  if (componentBase) {
    return `${componentBase}.${key}`
  }

  return pageKey ?? key
}
