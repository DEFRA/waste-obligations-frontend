import { describe, expect, test } from 'vitest'

import {
  csoStatementPath,
  producerCertificatePath
} from './compliance-paths.js'

describe('compliance paths', () => {
  test('producerCertificatePath builds producer certificate route', () => {
    expect(producerCertificatePath('org-1')).toBe(
      '/producer/org-1/compliance/certificate'
    )
    expect(producerCertificatePath('org-1', '/submit')).toBe(
      '/producer/org-1/compliance/certificate/submit'
    )
  })

  test('csoStatementPath builds CSO statement route', () => {
    expect(csoStatementPath('scheme-1')).toBe(
      '/cso/scheme-1/compliance/statement'
    )
    expect(csoStatementPath('scheme-1', '/submit')).toBe(
      '/cso/scheme-1/compliance/statement/submit'
    )
    expect(csoStatementPath('scheme-1', '/declaration-1/success')).toBe(
      '/cso/scheme-1/compliance/statement/declaration-1/success'
    )
  })
})
