import { describe, expect, test } from 'vitest'

import * as middlewares from './index.js'

describe('cso _middlewares index', () => {
  test('re-exports CSO middleware handlers', () => {
    expect(middlewares.currentComplianceScheme).toMatchObject({
      assign: 'currentComplianceScheme',
      method: expect.any(Function)
    })
    expect(middlewares.organisation).toMatchObject({
      assign: 'organisation'
    })
    expect(middlewares.prn).toMatchObject({
      assign: 'prn'
    })
    expect(middlewares.prns).toMatchObject({
      assign: 'prns'
    })
  })

  test('does not re-export producer organisation enrolment', () => {
    expect(middlewares.currentOrganisation).toBeUndefined()
  })
})
