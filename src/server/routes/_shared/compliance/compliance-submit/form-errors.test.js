import { describe, expect, test } from 'vitest'

import { mergeFormErrors } from './form-errors.js'

describe('mergeFormErrors', () => {
  test('returns null when all errors are falsy', () => {
    expect(mergeFormErrors(null, undefined, null)).toBeNull()
  })

  test('returns a single error unchanged', () => {
    const error = {
      summary: [{ text: 'Enter your full name', href: '#fullName' }],
      fields: { fullName: 'Enter your full name' }
    }

    expect(mergeFormErrors(null, error)).toEqual(error)
  })

  test('merges summary and fields from multiple errors', () => {
    expect(
      mergeFormErrors(
        {
          summary: [{ text: 'Enter your full name', href: '#fullName' }],
          fields: { fullName: 'Enter your full name' }
        },
        {
          summary: [
            {
              text: "You must select 'yes' or 'no' to continue",
              href: '#regulation43Compliant'
            }
          ],
          fields: {
            regulation43Compliant: "You must select 'yes' or 'no' to continue"
          }
        }
      )
    ).toEqual({
      summary: [
        { text: 'Enter your full name', href: '#fullName' },
        {
          text: "You must select 'yes' or 'no' to continue",
          href: '#regulation43Compliant'
        }
      ],
      fields: {
        fullName: 'Enter your full name',
        regulation43Compliant: "You must select 'yes' or 'no' to continue"
      }
    })
  })
})
