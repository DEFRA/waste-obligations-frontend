import { describe, expect, test } from 'vitest'

import { buildPrnsCsv, csvCell } from './prns-csv.js'

function buildPrn(overrides = {}) {
  return {
    id: 'a1',
    number: 'PRN-001',
    type: 'PRN',
    status: 'Accepted',
    issuedAt: '2025-03-04T10:00:00.000Z',
    obligationYear: 2025,
    decemberWaste: false,
    material: 'Plastic',
    recyclingProcess: 'Reprocessing',
    tonnage: 12.5,
    accreditationNumber: 'ACC-1',
    additionalNotes: null,
    issuer: { organisationName: 'Reprocessor Ltd' },
    recipient: { displayName: 'Producer Ltd' },
    audit: { acceptedAt: '2025-04-05T09:00:00.000Z', cancelledAt: null },
    ...overrides
  }
}

describe('csvCell', () => {
  test.each([
    [null, ''],
    [undefined, ''],
    [12.5, '12.5'],
    ['plain', 'plain'],
    ['a,b', '"a,b"'],
    ['say "hi"', '"say ""hi"""'],
    ['line\nbreak', '"line\nbreak"'],
    ['=SUM(A1)', "'=SUM(A1)"],
    ['+1', "'+1"],
    ['-1', "'-1"],
    ['@cmd', "'@cmd"]
  ])('writes %j as %j', (value, expected) => {
    expect(csvCell(value)).toBe(expected)
  })
})

describe('buildPrnsCsv', () => {
  test('is empty when there are no PRNs', () => {
    expect(buildPrnsCsv([], 'en')).toBe('')
  })

  test('writes the Packaging columns in English', () => {
    const [header] = buildPrnsCsv([buildPrn()], 'en').split('\r\n')

    expect(header).toBe(
      'PRN or PERN number,PRN or PERN,Status,Issued by,Issued to,Accreditation number,Date issued,December waste,Obligation year,Material,Recycling process,Tonnes,Date accepted,Date cancelled,Issuer note'
    )
  })

  test('writes an accepted PRN as a row', () => {
    const lines = buildPrnsCsv([buildPrn()], 'en').split('\r\n')

    expect(lines[1]).toBe(
      'PRN-001,PRN,Accepted,Reprocessor Ltd,Producer Ltd,ACC-1,04/03/2025,N,2025,Plastic,Reprocessing,12.5,05/04/2025,not cancelled,not provided'
    )
  })

  test('shows the cancelled date only for a cancelled PRN', () => {
    const csv = buildPrnsCsv(
      [
        buildPrn({
          status: 'Cancelled',
          audit: { cancelledAt: '2025-06-07T09:00:00.000Z' }
        })
      ],
      'en'
    )

    expect(csv).toContain(',not accepted,07/06/2025,')
  })

  test('writes December waste, the issuer note and a PERN', () => {
    const csv = buildPrnsCsv(
      [
        buildPrn({
          type: 'PERN',
          decemberWaste: true,
          status: 'AwaitingAcceptance',
          additionalNotes: 'Check, please'
        })
      ],
      'en'
    )

    expect(csv).toContain(',PERN,Awaiting acceptance,')
    expect(csv).toContain(',Y,2025,')
    expect(csv).toContain(',"Check, please"\r\n')
  })

  test('writes the headings and values in Welsh', () => {
    const [header, row] = buildPrnsCsv([buildPrn()], 'cy').split('\r\n')

    expect(header.startsWith('Rhif PRN neu PERN,PRN neu PERN,Statws,')).toBe(
      true
    )
    expect(row).toContain(",Wedi'i dderbyn,")
    expect(row).toContain(',Nage,')
    expect(row).toContain(',heb ei ddarparu')
  })

  test('ends every line with CRLF', () => {
    expect(buildPrnsCsv([buildPrn()], 'en').endsWith('\r\n')).toBe(true)
  })
})
