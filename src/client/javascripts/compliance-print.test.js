import { describe, expect, test } from 'vitest'

import {
  buildCompliancePrintFilename,
  formatPrintTimestamp,
  sanitizeFilenamePart,
  sanitizeOrganisationNameForFilename
} from './compliance-print.js'

describe('compliance-print', () => {
  test('formatPrintTimestamp formats as DDMMYY-HHMMSS', () => {
    const timestamp = formatPrintTimestamp(new Date('2026-07-08T09:46:55'))

    expect(timestamp).toBe('080726-094655')
  })

  test('sanitizeFilenamePart removes invalid filename characters', () => {
    expect(sanitizeFilenamePart('Acme/Corp: Ltd?')).toBe('AcmeCorp Ltd')
  })

  test('sanitizeOrganisationNameForFilename replaces spaces with underscores', () => {
    expect(sanitizeOrganisationNameForFilename('Example Operator Ltd')).toBe(
      'Example_Operator_Ltd'
    )
  })

  test('buildCompliancePrintFilename builds producer certificate filename', () => {
    expect(
      buildCompliancePrintFilename({
        documentType: 'Certificate',
        organisationName: 'Acme Packaging Ltd',
        obligationYear: '2026',
        timestamp: '080726-094655'
      })
    ).toBe('Certificate_Acme_Packaging_Ltd_2026_080726-094655')
  })

  test('buildCompliancePrintFilename builds CSO statement filename', () => {
    expect(
      buildCompliancePrintFilename({
        documentType: 'Statement',
        organisationName: 'Scheme Operator Ltd',
        obligationYear: '2026',
        timestamp: '080726-094655'
      })
    ).toBe('Statement_Scheme_Operator_Ltd_2026_080726-094655')
  })
})
