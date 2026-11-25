import { afterEach, describe, expect, test, vi } from 'vitest'
import { initPrnsSelection } from './prns-selection.js'

const url = '/producer/org-1/prns/selection?year=2026&sort=TonnageDescending'

function buildForm(fields, selectionUrl = url) {
  const handlers = {}

  return {
    fields,
    dataset: selectionUrl ? { selectionUrl } : {},
    addEventListener: vi.fn((event, handler) => {
      handlers[event] = handler
    }),
    change(target) {
      handlers.change({ target })
    }
  }
}

// FormData over the stub form: its fields as [name, value] pairs.
class StubFormData {
  constructor(form) {
    this.entries = form.fields()
  }

  [Symbol.iterator]() {
    return this.entries[Symbol.iterator]()
  }
}

function stubGlobals(form, fetchImpl = vi.fn(() => Promise.resolve({}))) {
  globalThis.document = { querySelector: vi.fn(() => form) }
  globalThis.FormData = StubFormData
  globalThis.fetch = fetchImpl

  return fetchImpl
}

function sentBody(fetchMock, call = 0) {
  return fetchMock.mock.calls[call][1].body.toString()
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

// The globals each test stubs, put back afterwards so no other test sees them.
const STUBBED_GLOBALS = ['document', 'FormData', 'fetch']
const originals = Object.fromEntries(
  STUBBED_GLOBALS.map((name) => [name, globalThis[name]])
)

describe('prns-selection', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    for (const name of STUBBED_GLOBALS) {
      globalThis[name] = originals[name]
    }
  })

  test('does nothing when the page has no selection form', () => {
    const fetchMock = stubGlobals(null)

    initPrnsSelection()

    expect(fetchMock).not.toHaveBeenCalled()
  })

  test('does nothing when the form has no selection address', () => {
    const form = buildForm(() => [], null)
    stubGlobals(form)

    initPrnsSelection()

    expect(form.addEventListener).not.toHaveBeenCalled()
  })

  test('posts the CSRF token and every ticked box when a box is ticked', async () => {
    const form = buildForm(() => [
      ['crumb', 'token-1'],
      ['selectedPrnIds', 'prn-1'],
      ['selectedPrnIds', 'prn-2']
    ])
    const fetchMock = stubGlobals(form)

    initPrnsSelection()
    form.change({ name: 'selectedPrnIds' })
    await flush()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [sentUrl, options] = fetchMock.mock.calls[0]
    expect(sentUrl).toBe(url)
    expect(options).toEqual(
      expect.objectContaining({
        method: 'POST',
        credentials: 'same-origin',
        keepalive: true
      })
    )
    expect(sentBody(fetchMock)).toBe(
      'crumb=token-1&selectedPrnIds=prn-1&selectedPrnIds=prn-2'
    )
  })

  test('posts when the last box is unticked, with no ticks', async () => {
    const form = buildForm(() => [['crumb', 'token-1']])
    const fetchMock = stubGlobals(form)

    initPrnsSelection()
    form.change({ name: 'selectedPrnIds' })
    await flush()

    expect(sentBody(fetchMock)).toBe('crumb=token-1')
  })

  test('ignores changes to other fields', async () => {
    const form = buildForm(() => [])
    const fetchMock = stubGlobals(form)

    initPrnsSelection()
    form.change({ name: 'sort' })
    await flush()

    expect(fetchMock).not.toHaveBeenCalled()
  })

  test('sends one save at a time, then the latest ticks once it finishes', async () => {
    let ticked = [['selectedPrnIds', 'prn-1']]
    const form = buildForm(() => ticked)
    let finishFirst
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finishFirst = resolve
          })
      )
      .mockImplementation(() => Promise.resolve({}))
    stubGlobals(form, fetchMock)

    initPrnsSelection()
    form.change({ name: 'selectedPrnIds' })
    ticked = [
      ['selectedPrnIds', 'prn-1'],
      ['selectedPrnIds', 'prn-2']
    ]
    form.change({ name: 'selectedPrnIds' })
    ticked = [['selectedPrnIds', 'prn-2']]
    form.change({ name: 'selectedPrnIds' })

    expect(fetchMock).toHaveBeenCalledTimes(1)

    finishFirst({})
    await flush()

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(sentBody(fetchMock, 1)).toBe('selectedPrnIds=prn-2')
  })

  test('a failed save leaves the page as it is and later ticks are still sent', async () => {
    const form = buildForm(() => [['selectedPrnIds', 'prn-1']])
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(() => Promise.reject(new Error('offline')))
      .mockImplementation(() => Promise.resolve({}))
    stubGlobals(form, fetchMock)

    initPrnsSelection()
    form.change({ name: 'selectedPrnIds' })
    await flush()
    form.change({ name: 'selectedPrnIds' })
    await flush()

    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
