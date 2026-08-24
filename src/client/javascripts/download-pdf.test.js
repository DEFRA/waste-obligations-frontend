import { describe, expect, test, vi } from 'vitest'

const html2pdfSave = vi.fn()
const html2pdfSet = vi.fn(() => ({ save: html2pdfSave }))
const html2pdfFrom = vi.fn(() => ({ set: html2pdfSet }))
const html2pdf = vi.fn(() => ({ from: html2pdfFrom }))

vi.mock('./html2pdf-0.9.3.min', () => ({
  default: (...args) => html2pdf(...args)
}))

const { initDownloadPdf } = await import('./download-pdf.js')

describe('download-pdf', () => {
  test('initDownloadPdf registers a DOMContentLoaded listener', () => {
    const addEventListener = vi.fn()
    globalThis.document = { addEventListener }

    initDownloadPdf()

    expect(addEventListener).toHaveBeenCalledWith(
      'DOMContentLoaded',
      expect.any(Function)
    )
  })

  test('does nothing when the download button is not present', () => {
    let domContentLoadedHandler
    const querySelector = vi.fn(() => null)

    globalThis.document = {
      addEventListener: vi.fn((event, cb) => {
        if (event === 'DOMContentLoaded') domContentLoadedHandler = cb
      }),
      querySelector
    }

    initDownloadPdf()
    domContentLoadedHandler()

    expect(querySelector).toHaveBeenCalledWith(
      '.download-pdf-button.govuk-link'
    )
  })

  test('downloads and saves the PDF when the button is clicked', async () => {
    let domContentLoadedHandler
    let clickHandler

    const tempDiv = { innerHTML: '', remove: vi.fn() }
    const downloadButton = {
      addEventListener: vi.fn((event, cb) => {
        if (event === 'click') clickHandler = cb
      })
    }

    globalThis.document = {
      addEventListener: vi.fn((event, cb) => {
        if (event === 'DOMContentLoaded') domContentLoadedHandler = cb
      }),
      querySelector: vi.fn(() => downloadButton),
      createElement: vi.fn(() => tempDiv)
    }

    globalThis.window = {
      location: { pathname: '/report-data/accepted-prn/abc-123' }
    }

    globalThis.fetch = vi.fn(() =>
      Promise.resolve({
        json: () =>
          Promise.resolve({
            fileName: 'my-report',
            htmlContent: '<p>content</p>'
          })
      })
    )

    initDownloadPdf()
    domContentLoadedHandler()
    clickHandler()

    await vi.waitFor(() => expect(tempDiv.remove).toHaveBeenCalledOnce())

    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/report-data/download-accepted-prn-pdf/abc-123',
      { method: 'GET', headers: { 'Content-Type': 'application/json' } }
    )
    expect(tempDiv.innerHTML).toBe('<p>content</p>')
    expect(html2pdfFrom).toHaveBeenCalledWith(tempDiv)
    expect(html2pdfSet).toHaveBeenCalledWith({
      margin: [0, 10, 0, 10],
      filename: 'my-report.pdf',
      html2canvas: {
        scale: 2,
        width: 794,
        dpi: 300,
        letterRendering: true,
        useCORS: true
      },
      jsPDF: { unit: 'pt', format: 'a4', orientation: 'portrait' }
    })
    expect(html2pdfSave).toHaveBeenCalledOnce()
  })

  test('logs an error when downloadPDF fails', async () => {
    let domContentLoadedHandler
    let clickHandler

    const downloadButton = {
      addEventListener: vi.fn((event, cb) => {
        if (event === 'click') clickHandler = cb
      })
    }

    globalThis.document = {
      addEventListener: vi.fn((event, cb) => {
        if (event === 'DOMContentLoaded') domContentLoadedHandler = cb
      }),
      querySelector: vi.fn(() => downloadButton)
    }

    globalThis.window = {
      location: { pathname: '/report-data/rejected-prn/xyz-789' }
    }

    const fetchError = new Error('network down')
    globalThis.fetch = vi.fn(() => Promise.reject(fetchError))

    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {})

    initDownloadPdf()
    domContentLoadedHandler()
    clickHandler()

    await vi.waitFor(() =>
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error in downloadPDF:',
        fetchError
      )
    )

    consoleErrorSpy.mockRestore()
  })
})
