import { describe, test, expect } from 'vitest'

import * as middlewares from './index.js'

describe('compliance _middlewares index', () => {
  test('re-exports compliance middleware handlers', () => {
    expect(middlewares.currentOrganisation).toMatchObject({
      assign: 'currentOrganisation',
      method: expect.any(Function)
    })
    expect(middlewares.currentComplianceScheme).toMatchObject({
      assign: 'currentComplianceScheme',
      method: expect.any(Function)
    })
    expect(middlewares.organisation).toMatchObject({
      assign: 'organisation'
    })
    expect(middlewares.obligations).toMatchObject({
      assign: 'obligations'
    })
    expect(middlewares.declarations).toMatchObject({
      assign: 'declarations'
    })
  })
})
