import { describe, expect, test, vi } from 'vitest'

import {
  buildCompliancePrintFilename,
  formatPrintTimestamp,
  initCompliancePrint,
  sanitizeFilenamePart,
  sanitizeOrganisationNameForFilename
} from './compliance-print.js'

describe('compliance-print', () => {
  test('initCompliancePrint returns immediately when no button exists', () => {
    const querySelector = vi.fn(() => null)

    // Simulate the browser globals used by initCompliancePrint.
    globalThis.document = { querySelector }
    globalThis.window = {
      print: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    }

    initCompliancePrint()

    expect(querySelector).toHaveBeenCalledOnce()
    expect(globalThis.window.print).not.toHaveBeenCalled()
  })

  test('initCompliancePrint wires click handler and restores document title after afterprint', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-08T09:46:55'))

    const afterprintHandlers = []
    const originalTitle = 'Original Title'
    let clickHandler

    const button = {
      dataset: {
        documentType: 'Statement',
        organisationName: 'Example Operator Ltd',
        obligationYear: '2026'
      },
      addEventListener: vi.fn((event, cb) => {
        if (event === 'click') clickHandler = cb
      })
    }

    const querySelector = vi.fn(() => button)

    globalThis.document = {
      querySelector,
      get title() {
        return this._title ?? originalTitle
      },
      set title(value) {
        this._title = value
      }
    }

    globalThis.window = {
      print: vi.fn(),
      addEventListener: vi.fn((event, cb) => {
        if (event === 'afterprint') afterprintHandlers.push(cb)
      }),
      removeEventListener: vi.fn()
    }

    initCompliancePrint()

    expect(button.addEventListener).toHaveBeenCalledWith(
      'click',
      expect.any(Function)
    )
    expect(typeof clickHandler).toBe('function')

    const expectedPrintTitle = buildCompliancePrintFilename({
      documentType: 'Statement',
      organisationName: 'Example Operator Ltd',
      obligationYear: '2026',
      timestamp: '080726-094655'
    })

    clickHandler()

    expect(globalThis.window.print).toHaveBeenCalledOnce()
    expect(globalThis.document.title).toBe(expectedPrintTitle)
    expect(afterprintHandlers).toHaveLength(1)

    // Simulate the afterprint callback.
    afterprintHandlers[0]()

    expect(globalThis.document.title).toBe(originalTitle)
    expect(globalThis.window.removeEventListener).toHaveBeenCalledWith(
      'afterprint',
      afterprintHandlers[0]
    )

    vi.useRealTimers()
  })

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
