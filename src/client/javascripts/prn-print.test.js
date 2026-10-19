import { describe, expect, test, vi } from 'vitest'

import {
  downloadPrnPdf,
  initPrnPrint,
  loadHtml2pdf,
  preparePrnPdfSource,
  prnPdfOptions
} from './prn-print.js'

const PDF_EXCLUDED =
  '.notification-banner, .prn-buttons, .pern-buttons, [data-prn-print], .prn-hide-in-pdf'

function fakeElement() {
  return {
    remove: vi.fn(),
    style: {}
  }
}

describe('prnPdfOptions', () => {
  test('matches the packaging frontend PDF settings and uses the PRN number as the filename', () => {
    expect(prnPdfOptions('EX2617420')).toEqual({
      margin: [0, 10, 0, 10],
      filename: 'EX2617420.pdf',
      html2canvas: {
        scale: 2,
        width: 794,
        dpi: 300,
        letterRendering: true,
        useCORS: true
      },
      jsPDF: { unit: 'pt', format: 'a4', orientation: 'portrait' }
    })
  })
})

describe('preparePrnPdfSource', () => {
  test('drops the green banner, buttons, download link and screen-only rows, and keeps PNG logos', () => {
    const banner = fakeElement()
    const buttons = fakeElement()
    const downloadLink = fakeElement()
    const screenStatus = fakeElement()
    const tonnageInWords = fakeElement()
    const svgLogo = fakeElement()
    const groups = {
      [PDF_EXCLUDED]: [banner, buttons, downloadLink, screenStatus],
      '.prn-pdf-only': [tonnageInWords],
      '.prn-logos-items img:not(.prn-pdf-logo)': [svgLogo]
    }
    const source = {
      querySelectorAll: vi.fn((selector) => groups[selector] ?? [])
    }
    const view = { cloneNode: vi.fn(() => source) }

    expect(preparePrnPdfSource(view)).toBe(source)
    expect(view.cloneNode).toHaveBeenCalledWith(true)
    expect(banner.remove).toHaveBeenCalledOnce()
    expect(buttons.remove).toHaveBeenCalledOnce()
    expect(downloadLink.remove).toHaveBeenCalledOnce()
    expect(screenStatus.remove).toHaveBeenCalledOnce()
    expect(svgLogo.remove).toHaveBeenCalledOnce()
    expect(tonnageInWords.style.display).toBe('block')
    expect(tonnageInWords.remove).not.toHaveBeenCalled()
  })
})

describe('downloadPrnPdf', () => {
  test('saves a PDF named after the PRN number', async () => {
    const source = { querySelectorAll: () => [] }
    const view = { cloneNode: () => source }
    const button = {
      dataset: { prnNumber: 'EX/2617:420' },
      closest: vi.fn(() => view)
    }
    const save = vi.fn()
    const set = vi.fn(() => ({ save }))
    const from = vi.fn(() => ({ set }))
    const html2pdf = vi.fn(() => ({ from }))

    await downloadPrnPdf(button, html2pdf)

    expect(button.closest).toHaveBeenCalledWith('.prn-view, .pern-view')
    expect(from).toHaveBeenCalledWith(source)
    expect(set).toHaveBeenCalledWith(prnPdfOptions('EX2617420'))
    expect(save).toHaveBeenCalledOnce()
  })

  test('does nothing when the button is not on a PRN page', async () => {
    const html2pdf = vi.fn()

    await downloadPrnPdf({ dataset: {}, closest: () => null }, html2pdf)

    expect(html2pdf).not.toHaveBeenCalled()
  })
})

describe('loadHtml2pdf', () => {
  test('loads the packaging html2pdf script instead of importing it as a module', async () => {
    const script = {}
    const appendChild = vi.fn()

    globalThis.document = {
      createElement: vi.fn(() => script),
      head: { appendChild }
    }
    globalThis.html2pdf = undefined

    const pending = loadHtml2pdf()

    expect(script.src).toContain('html2pdf-0.9.3.min.js')
    expect(appendChild).toHaveBeenCalledWith(script)

    globalThis.html2pdf = function html2pdf() {
      return {}
    }
    script.onload()

    await expect(pending).resolves.toBe(globalThis.html2pdf)
  })
})

describe('initPrnPrint', () => {
  test('does nothing when no download button exists', () => {
    const querySelectorAll = vi.fn(() => [])
    globalThis.document = { querySelectorAll }

    initPrnPrint()

    expect(querySelectorAll).toHaveBeenCalledWith('[data-prn-print]')
  })

  test('wires a click handler that reports a failed download', async () => {
    let clickHandler
    const button = {
      dataset: { prnNumber: 'EX2617420' },
      closest: () => {
        throw new Error('boom')
      },
      addEventListener: vi.fn((event, callback) => {
        if (event === 'click') clickHandler = callback
      })
    }
    globalThis.document = { querySelectorAll: () => [button] }
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const event = { preventDefault: vi.fn() }

    initPrnPrint()
    clickHandler(event)

    expect(event.preventDefault).toHaveBeenCalledOnce()

    await vi.waitFor(() => {
      expect(error).toHaveBeenCalledWith('Unable to download the PRN PDF')
    })
  })
})
