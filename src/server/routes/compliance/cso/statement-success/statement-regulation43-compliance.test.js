import { describe, expect, test } from 'vitest'

import {
  isStatementRegulation43Compliant,
  statementRegulation43ComplianceI18nKey
} from './statement-regulation43-compliance.js'

describe('isStatementRegulation43Compliant', () => {
  test.each([
    { obligationStatus: 'Met', isRegulation43Compliant: true, expected: true },
    {
      obligationStatus: 'Met',
      isRegulation43Compliant: false,
      expected: false
    },
    {
      obligationStatus: 'NotMet',
      isRegulation43Compliant: true,
      expected: false
    },
    {
      obligationStatus: 'NotMet',
      isRegulation43Compliant: false,
      expected: false
    }
  ])(
    'returns $expected when obligationStatus is $obligationStatus and regulation 43 is $isRegulation43Compliant',
    ({ obligationStatus, isRegulation43Compliant, expected }) => {
      expect(
        isStatementRegulation43Compliant({
          obligationStatus,
          isRegulation43Compliant
        })
      ).toBe(expected)
    }
  )
})

describe('statementRegulation43ComplianceI18nKey', () => {
  test('returns complied key when obligations are met and regulation 43 is yes', () => {
    expect(
      statementRegulation43ComplianceI18nKey({
        obligationStatus: 'Met',
        isRegulation43Compliant: true
      })
    ).toBe('compliance.components.success.publicRegisterRegulation43Complied')
  })

  test('returns not complied key otherwise', () => {
    expect(
      statementRegulation43ComplianceI18nKey({
        obligationStatus: 'Met',
        isRegulation43Compliant: false
      })
    ).toBe(
      'compliance.components.success.publicRegisterRegulation43NotComplied'
    )
  })
})
