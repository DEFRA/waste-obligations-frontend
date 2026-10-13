import { describe, expect, test, vi } from 'vitest'
import { buildPrnPrintFilename, initPrnPrint } from './prn-print.js'

describe('prn-print', () => {
  test('initPrnPrint returns immediately when no button exists', () => {
    const querySelector = vi.fn(() => null)

    // Simulate the browser globals used by initPrnPrint.
    globalThis.document = { querySelector }
    globalThis.window = {
      print: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    }

    initPrnPrint()

    expect(querySelector).toHaveBeenCalledWith('[data-prn-print]')
    expect(globalThis.window.print).not.toHaveBeenCalled()
  })

  test('initPrnPrint wires click handler and restores document title after afterprint', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-08T09:46:55'))

    const afterprintHandlers = []
    const originalTitle = 'Original Title'
    let clickHandler

    const button = {
      dataset: {
        documentType: 'PRN',
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

    initPrnPrint()

    expect(button.addEventListener).toHaveBeenCalledWith(
      'click',
      expect.any(Function)
    )
    expect(typeof clickHandler).toBe('function')

    const expectedPrintTitle = buildPrnPrintFilename({
      documentType: 'PRN',
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

  test('buildPrnPrintFilename builds a PRN filename', () => {
    expect(
      buildPrnPrintFilename({
        documentType: 'PRN',
        organisationName: 'Acme Packaging Ltd',
        obligationYear: '2026',
        timestamp: '080726-094655'
      })
    ).toBe('PRN_Acme_Packaging_Ltd_2026_080726-094655')
  })

  test('buildPrnPrintFilename builds a PERN filename', () => {
    expect(
      buildPrnPrintFilename({
        documentType: 'PERN',
        organisationName: 'Scheme Operator Ltd',
        obligationYear: '2026',
        timestamp: '080726-094655'
      })
    ).toBe('PERN_Scheme_Operator_Ltd_2026_080726-094655')
  })
})
