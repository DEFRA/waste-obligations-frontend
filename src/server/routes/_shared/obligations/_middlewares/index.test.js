import { describe, expect, test } from 'vitest'

import * as middlewares from './index.js'

describe('obligations _middlewares index', () => {
  test('re-exports shared obligations middleware handlers', () => {
    expect(middlewares.approvedUser).toMatchObject({
      assign: 'approvedUser',
      method: expect.any(Function)
    })
    expect(middlewares.currentOrganisation).toMatchObject({
      assign: 'currentOrganisation',
      method: expect.any(Function)
    })
    expect(middlewares.organisation).toMatchObject({
      assign: 'organisation'
    })
    expect(middlewares.currentComplianceScheme).toMatchObject({
      assign: 'currentComplianceScheme',
      method: expect.any(Function)
    })
    expect(middlewares.obligationsForYear).toMatchObject({
      assign: 'obligations',
      method: expect.any(Function)
    })
    expect(middlewares.awaitingAcceptancePrns).toMatchObject({
      assign: 'awaitingAcceptancePrns',
      method: expect.any(Function)
    })
  })
})
