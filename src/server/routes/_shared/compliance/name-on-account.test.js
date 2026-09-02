import { describe, expect, test } from 'vitest'

import {
  formatNameOnAccount,
  nameOnAccountFromAudit
} from '#/server/routes/_shared/compliance/name-on-account.js'

describe('formatNameOnAccount', () => {
  test('joins first and last name from the account user', () => {
    expect(formatNameOnAccount({ firstName: 'Jane', lastName: 'Doe' })).toBe(
      'Jane Doe'
    )
  })

  test('returns empty string when names are missing', () => {
    expect(formatNameOnAccount({})).toBe('')
  })
})

describe('nameOnAccountFromAudit', () => {
  test('returns the submitted audit user name', () => {
    expect(
      nameOnAccountFromAudit([
        {
          action: 'Submitted',
          user: {
            id: 'user-id',
            email: 'user@example.com',
            name: 'Account Holder'
          },
          timestamp: '2026-04-02T14:00:00+00:00'
        }
      ])
    ).toBe('Account Holder')
  })

  test('returns empty string when submitted audit entry is missing', () => {
    expect(nameOnAccountFromAudit([])).toBe('')
  })
})
