import { describe, expect, test } from 'vitest'

import { resolveStatementComplianceStatus } from './statement-compliance-status.js'

describe('resolveStatementComplianceStatus', () => {
  test.each([
    {
      obligationStatus: 'Met',
      isRegulation43Compliant: true,
      variant: 'met',
      straplineKey: 'obligationsMetCompliedStrapline',
      subtextKey: 'obligationsMetCompliedSubtext'
    },
    {
      obligationStatus: 'Met',
      isRegulation43Compliant: false,
      variant: 'not-met',
      straplineKey: 'notCompliantReg43Strapline',
      subtextKey: 'obligationsMetReg43NotCompliedSubtext'
    },
    {
      obligationStatus: 'NotMet',
      isRegulation43Compliant: true,
      variant: 'not-met',
      straplineKey: 'notCompliantReg43Strapline',
      subtextKey: 'obligationsNotMetReg43CompliedSubtext'
    },
    {
      obligationStatus: 'NotMet',
      isRegulation43Compliant: false,
      variant: 'not-met',
      straplineKey: 'notCompliantReg43Strapline',
      subtextKey: 'obligationsNotMetReg43NotCompliedSubtext'
    }
  ])(
    'returns $variant status when obligations are $obligationStatus and regulation 43 is $isRegulation43Compliant',
    ({
      obligationStatus,
      isRegulation43Compliant,
      variant,
      straplineKey,
      subtextKey
    }) => {
      expect(
        resolveStatementComplianceStatus({
          obligationStatus,
          isRegulation43Compliant
        })
      ).toEqual({
        variant,
        straplineKey,
        subtextKey
      })
    }
  )
})
