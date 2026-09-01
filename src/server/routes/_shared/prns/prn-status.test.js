import { describe, expect, test } from 'vitest'

import {
  PRN_STATUS,
  PRN_STATUSES
} from '#/server/services/schemas/waste-obligations.schemas.js'
import { isPrnStatusEditable } from './prn-status.js'

describe('isPrnStatusEditable', () => {
  test.each([PRN_STATUS.ACCEPTED, PRN_STATUS.REJECTED, PRN_STATUS.CANCELLED])(
    'is false for a %s PRN',
    (status) => {
      expect(isPrnStatusEditable({ status })).toBe(false)
    }
  )

  test('is true for a PRN awaiting acceptance', () => {
    expect(
      isPrnStatusEditable({ status: PRN_STATUS.AWAITING_ACCEPTANCE })
    ).toBe(true)
  })

  test('is true when the status is missing or the PRN is undefined', () => {
    expect(isPrnStatusEditable({})).toBe(true)
    expect(isPrnStatusEditable(undefined)).toBe(true)
  })

  test('classifies every known PRN status (guards against a new status being missed)', () => {
    const editable = PRN_STATUSES.filter((status) =>
      isPrnStatusEditable({ status })
    )

    expect(editable).toEqual([PRN_STATUS.AWAITING_ACCEPTANCE])
  })
})
