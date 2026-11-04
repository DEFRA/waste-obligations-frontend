import { describe, test, expect } from 'vitest'

import { buildSubmittedDeclaration } from './submitted-declaration.js'

const plainRequest = { headers: {} }
const proxiedRequest = {
  headers: { 'x-forwarded-prefix': '/manage-recycling-obligations' }
}

function submitted(id, status = 'Submitted') {
  return { id, obligationYear: 2026, status }
}

describe('buildSubmittedDeclaration', () => {
  test('returns null when nothing was submitted for the year', () => {
    expect(
      buildSubmittedDeclaration({
        request: plainRequest,
        locale: 'en',
        isProducer: true,
        pathId: 'org-1',
        declarations: [],
        obligationYear: 2026
      })
    ).toBeNull()
  })

  test('ignores a cancelled declaration', () => {
    expect(
      buildSubmittedDeclaration({
        request: plainRequest,
        locale: 'en',
        isProducer: true,
        pathId: 'org-1',
        declarations: [submitted('d-1', 'Cancelled')],
        obligationYear: 2026
      })
    ).toBeNull()
  })

  test('links a producer to the submitted certificate', () => {
    const result = buildSubmittedDeclaration({
      request: plainRequest,
      locale: 'en',
      isProducer: true,
      pathId: 'org-1',
      declarations: [submitted('d-1')],
      obligationYear: 2026
    })

    expect(result.href).toContain('/producer/org-1/')
    expect(result.href).toContain('d-1')
    expect(result.heading).toEqual(expect.any(String))
    expect(result.paragraphPrefix).toEqual(expect.any(String))
    expect(result.buttonLabel).toEqual(expect.any(String))
  })

  test('links a CSO to the submitted statement', () => {
    const result = buildSubmittedDeclaration({
      request: plainRequest,
      locale: 'en',
      isProducer: false,
      pathId: 'scheme-1',
      declarations: [submitted('d-2')],
      obligationYear: 2026
    })

    expect(result.href).toContain('/cso/scheme-1/')
    expect(result.href).toContain('d-2')
  })

  test('adds the forwarded prefix to the link', () => {
    const result = buildSubmittedDeclaration({
      request: proxiedRequest,
      locale: 'en',
      isProducer: true,
      pathId: 'org-1',
      declarations: [submitted('d-1')],
      obligationYear: 2026
    })

    expect(result.href.startsWith('/manage-recycling-obligations/')).toBe(true)
  })
})
