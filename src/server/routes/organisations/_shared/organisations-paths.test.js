import { describe, expect, test } from 'vitest'

import { acceptPrnPath, rejectPrnPath } from './organisations-paths.js'

describe('organisations paths', () => {
  test('acceptPrnPath builds the selected-prn route', () => {
    expect(acceptPrnPath('org-1', 'prn-1')).toBe(
      '/prns/org-1/selected-prn/prn-1'
    )
  })

  test('rejectPrnPath builds the same selected-prn route', () => {
    expect(rejectPrnPath('org-1', 'prn-1')).toBe(
      '/prns/org-1/selected-prn/prn-1'
    )
  })
})
