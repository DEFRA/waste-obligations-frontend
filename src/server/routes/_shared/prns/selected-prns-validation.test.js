import { describe, expect, test } from 'vitest'

import {
  SELECTED_PRNS_FIELD_ID,
  getSelectedPrnIds,
  getSelectedPrnsFormErrors
} from './selected-prns-validation.js'

const prnId = 'd93376e3-0681-46be-aeb4-7450a2e784d8'
const secondPrnId = 'a1b2c3d4-e5f6-4789-abcd-ef1234567890'
const errorMessage =
  'To accept multiple PRNs or PERNs select one or more using the check boxes'

describe('getSelectedPrnIds', () => {
  test('returns an empty array when the payload is missing or empty', () => {
    expect(getSelectedPrnIds()).toEqual([])
    expect(getSelectedPrnIds({})).toEqual([])
    expect(getSelectedPrnIds({ selectedPrnIds: [] })).toEqual([])
    expect(getSelectedPrnIds({ selectedPrnIds: '' })).toEqual([])
  })

  test('wraps a single selected id', () => {
    expect(getSelectedPrnIds({ selectedPrnIds: prnId })).toEqual([prnId])
  })

  test('keeps an array of selected ids and drops empty values', () => {
    expect(
      getSelectedPrnIds({ selectedPrnIds: [prnId, '', secondPrnId] })
    ).toEqual([prnId, secondPrnId])
  })
})

describe('getSelectedPrnsFormErrors', () => {
  test('returns null when at least one PRN is selected', () => {
    expect(getSelectedPrnsFormErrors([prnId], 'en')).toBeNull()
  })

  test('returns the error summary when no PRNs are selected', () => {
    expect(getSelectedPrnsFormErrors([], 'en')).toEqual({
      summary: [
        {
          text: errorMessage,
          href: `#${SELECTED_PRNS_FIELD_ID}`
        }
      ]
    })
  })
})
