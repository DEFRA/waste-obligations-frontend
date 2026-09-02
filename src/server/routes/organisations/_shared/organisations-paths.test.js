import { describe, expect, test } from 'vitest'

import {
  acceptPrnPath,
  rejectPrnPath,
  producerPrnsPath,
  csoPrnsPath
} from './organisations-paths.js'

describe('organisations paths', () => {
  test('acceptPrnPath builds the selected-prn route', () => {
    expect(acceptPrnPath('org-1', 'prn-1')).toBe(
      '/organisations/producer/org-1/prns/prn-1'
    )
  })

  test('rejectPrnPath builds the same selected-prn route', () => {
    expect(rejectPrnPath('org-1', 'prn-1')).toBe(
      '/organisations/producer/org-1/prns/prn-1'
    )
  })

  test('producerPrnsPath builds the producer PRNs list route', () => {
    expect(producerPrnsPath('org-1')).toBe('/organisations/producer/org-1/prns')
  })

  test('csoPrnsPath builds the CSO PRNs list route', () => {
    expect(csoPrnsPath('scheme-1')).toBe('/organisations/cso/scheme-1/prns')
  })
})
