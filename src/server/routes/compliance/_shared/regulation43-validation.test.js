import { describe, expect, test } from 'vitest'

import {
  getRegulation43FormErrors,
  isRegulation43Compliant
} from './regulation43-validation.js'

describe('regulation43-validation', () => {
  test('returns error when no option selected', () => {
    expect(getRegulation43FormErrors('', 'en')).toEqual({
      summary: [
        {
          text: "You must select 'yes' or 'no' to continue",
          href: '#regulation43Compliant'
        }
      ],
      fields: {
        regulation43Compliant: "You must select 'yes' or 'no' to continue"
      }
    })
  })

  test('returns null when yes or no selected', () => {
    expect(getRegulation43FormErrors('yes', 'en')).toBeNull()
    expect(getRegulation43FormErrors('no', 'en')).toBeNull()
  })

  test('maps yes to compliant and no to not compliant', () => {
    expect(isRegulation43Compliant('yes')).toBe(true)
    expect(isRegulation43Compliant('no')).toBe(false)
    expect(isRegulation43Compliant('')).toBe(false)
  })
})
