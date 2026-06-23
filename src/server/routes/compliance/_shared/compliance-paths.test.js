import { describe, expect, test } from 'vitest'

import {
  csoStatementPath,
  producerCertificatePath
} from './compliance-paths.js'

describe('compliance paths', () => {
  test('producerCertificatePath builds producer certificate route', () => {
    expect(producerCertificatePath('org-1')).toBe(
      '/compliance/producer/org-1/certificate'
    )
    expect(producerCertificatePath('org-1', '/submit')).toBe(
      '/compliance/producer/org-1/certificate/submit'
    )
  })

  test('csoStatementPath builds CSO statement route', () => {
    expect(csoStatementPath('scheme-1')).toBe(
      '/compliance/cso/scheme-1/statement'
    )
    expect(csoStatementPath('scheme-1', '/submit')).toBe(
      '/compliance/cso/scheme-1/statement/submit'
    )
  })
})
