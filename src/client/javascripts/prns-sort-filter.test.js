import { describe, expect, test, vi } from 'vitest'
import { initPrnsSortFilter } from './prns-sort-filter.js'

function buildSessionStorage(initial = {}) {
  const store = { ...initial }
  return {
    getItem: vi.fn((key) => store[key] ?? null),
    setItem: vi.fn((key, value) => {
      store[key] = value
    }),
    removeItem: vi.fn((key) => {
      delete store[key]
    })
  }
}

describe('prns-sort-filter', () => {
  test('initPrnsSortFilter returns immediately when no form exists', () => {
    const querySelector = vi.fn(() => null)
    globalThis.document = { querySelector }
    globalThis.sessionStorage = buildSessionStorage()

    initPrnsSortFilter()

    expect(querySelector).toHaveBeenCalledWith('[data-prns-sort-filter]')
  })

  test('submits the form when a select changes, remembering which select was focused', () => {
    const handlers = []
    const select = {
      id: 'sort',
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
    globalThis.sessionStorage = buildSessionStorage()

    initPrnsSortFilter()

    expect(form.querySelectorAll).toHaveBeenCalledWith('select')
    expect(handlers[0][0]).toBe('change')

    handlers[0][1]()

    expect(sessionStorage.setItem).toHaveBeenCalledWith(
      'prnsSortFilterFocusId',
      'sort'
    )
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
    globalThis.sessionStorage = buildSessionStorage()
    const formData = { delete: vi.fn() }

    initPrnsSortFilter()
    formDataHandler({ formData })

    expect(formData.delete).toHaveBeenCalledTimes(1)
    expect(formData.delete).toHaveBeenCalledWith('material')
  })

  test('restores focus to the select that triggered the reload', () => {
    const sortSelect = { id: 'sort', addEventListener: vi.fn(), focus: vi.fn() }
    const materialSelect = {
      id: 'filter',
      addEventListener: vi.fn(),
      focus: vi.fn()
    }
    const form = {
      addEventListener: vi.fn(),
      querySelectorAll: vi.fn(() => [sortSelect, materialSelect])
    }
    globalThis.document = { querySelector: vi.fn(() => form) }
    globalThis.sessionStorage = buildSessionStorage({
      prnsSortFilterFocusId: 'filter'
    })

    initPrnsSortFilter()

    expect(materialSelect.focus).toHaveBeenCalledTimes(1)
    expect(sortSelect.focus).not.toHaveBeenCalled()
    expect(sessionStorage.removeItem).toHaveBeenCalledWith(
      'prnsSortFilterFocusId'
    )
  })

  test('does not focus anything when no select was remembered', () => {
    const select = { id: 'sort', addEventListener: vi.fn(), focus: vi.fn() }
    const form = {
      addEventListener: vi.fn(),
      querySelectorAll: vi.fn(() => [select])
    }
    globalThis.document = { querySelector: vi.fn(() => form) }
    globalThis.sessionStorage = buildSessionStorage()

    initPrnsSortFilter()

    expect(select.focus).not.toHaveBeenCalled()
  })

  test('does not throw when sessionStorage is unavailable', () => {
    const select = {
      id: 'sort',
      addEventListener: vi.fn((event, handler) => {
        select.changeHandler = handler
      })
    }
    const form = {
      addEventListener: vi.fn(),
      submit: vi.fn(),
      querySelectorAll: vi.fn(() => [select])
    }
    globalThis.document = { querySelector: vi.fn(() => form) }
    globalThis.sessionStorage = {
      getItem: vi.fn(() => {
        throw new Error('SecurityError')
      }),
      setItem: vi.fn(() => {
        throw new Error('SecurityError')
      }),
      removeItem: vi.fn()
    }

    expect(() => initPrnsSortFilter()).not.toThrow()
    expect(() => select.changeHandler()).not.toThrow()
    expect(form.submit).toHaveBeenCalledTimes(1)
  })
})
