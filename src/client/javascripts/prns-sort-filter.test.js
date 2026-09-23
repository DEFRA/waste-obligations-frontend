import { describe, expect, test, vi } from 'vitest'
import { initPrnsSortFilter } from './prns-sort-filter.js'

describe('prns-sort-filter', () => {
  test('initPrnsSortFilter returns immediately when no form exists', () => {
    const querySelector = vi.fn(() => null)
    globalThis.document = { querySelector }

    initPrnsSortFilter()

    expect(querySelector).toHaveBeenCalledWith('[data-prns-sort-filter]')
  })

  test('submits the form when a select changes', () => {
    const handlers = []
    const select = {
      addEventListener: vi.fn((event, handler) =>
        handlers.push([event, handler])
      )
    }
    const form = {
      addEventListener: vi.fn(),
      submit: vi.fn(),
      querySelectorAll: vi.fn(() => [select])
    }
    globalThis.document = { querySelector: vi.fn(() => form) }

    initPrnsSortFilter()

    expect(form.querySelectorAll).toHaveBeenCalledWith('select')
    expect(handlers[0][0]).toBe('change')

    handlers[0][1]()

    expect(form.submit).toHaveBeenCalledTimes(1)
  })

  test('removes empty select values from the submitted form data', () => {
    let formDataHandler
    const selects = [
      { name: 'sort', value: 'IssuedAtDescending', addEventListener: vi.fn() },
      { name: 'material', value: '', addEventListener: vi.fn() }
    ]
    const form = {
      addEventListener: vi.fn((event, handler) => {
        if (event === 'formdata') formDataHandler = handler
      }),
      querySelectorAll: vi.fn(() => selects)
    }
    globalThis.document = { querySelector: vi.fn(() => form) }
    const formData = { delete: vi.fn() }

    initPrnsSortFilter()
    formDataHandler({ formData })

    expect(formData.delete).toHaveBeenCalledTimes(1)
    expect(formData.delete).toHaveBeenCalledWith('material')
  })
})
