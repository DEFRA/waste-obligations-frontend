import { describe, test, expect } from 'vitest'

import * as middlewares from './index.js'

describe('compliance _middlewares index', () => {
  test('re-exports organisation, obligations, and declarations handlers', () => {
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
