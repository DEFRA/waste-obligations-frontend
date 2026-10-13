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

function stubGlobals(form) {
  globalThis.document = { querySelector: vi.fn(() => form) }
  globalThis.sessionStorage = buildSessionStorage()
  globalThis.addEventListener = vi.fn()
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
    stubGlobals(form)

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

  test('disables the other select when one changes', () => {
    let changeHandler
    const sortSelect = {
      id: 'sort',
      addEventListener: vi.fn((event, handler) => {
        if (event === 'change') changeHandler = handler
      })
    }
    const materialSelect = { id: 'filter', addEventListener: vi.fn() }
    const form = {
      addEventListener: vi.fn(),
      submit: vi.fn(),
      querySelectorAll: vi.fn(() => [sortSelect, materialSelect])
    }
    stubGlobals(form)

    initPrnsSortFilter()
    changeHandler()

    expect(materialSelect.disabled).toBe(true)
    expect(sortSelect.disabled).toBeUndefined()
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
    stubGlobals(form)
    const formData = { delete: vi.fn(), set: vi.fn() }

    initPrnsSortFilter()
    formDataHandler({ formData })

    expect(formData.delete).toHaveBeenCalledTimes(1)
    expect(formData.delete).toHaveBeenCalledWith('material')
    expect(formData.set).not.toHaveBeenCalled()
  })

  test('restores a disabled select value into the submitted form data instead of dropping it', () => {
    let formDataHandler
    const selects = [
      {
        name: 'sort',
        value: 'TonnageDescending',
        disabled: false,
        addEventListener: vi.fn()
      },
      {
        name: 'material',
        value: 'Aluminium',
        disabled: true,
        addEventListener: vi.fn()
      }
    ]
    const form = {
      addEventListener: vi.fn((event, handler) => {
        if (event === 'formdata') formDataHandler = handler
      }),
      querySelectorAll: vi.fn(() => selects)
    }
    stubGlobals(form)
    const formData = { delete: vi.fn(), set: vi.fn() }

    initPrnsSortFilter()
    formDataHandler({ formData })

    expect(formData.set).toHaveBeenCalledWith('material', 'Aluminium')
    expect(formData.delete).not.toHaveBeenCalled()
  })

  test('does not reintroduce an empty disabled select into the submitted form data', () => {
    let formDataHandler
    const selects = [
      {
        name: 'material',
        value: '',
        disabled: true,
        addEventListener: vi.fn()
      }
    ]
    const form = {
      addEventListener: vi.fn((event, handler) => {
        if (event === 'formdata') formDataHandler = handler
      }),
      querySelectorAll: vi.fn(() => selects)
    }
    stubGlobals(form)
    const formData = { delete: vi.fn(), set: vi.fn() }

    initPrnsSortFilter()
    formDataHandler({ formData })

    expect(formData.set).not.toHaveBeenCalled()
    expect(formData.delete).not.toHaveBeenCalled()
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
    globalThis.addEventListener = vi.fn()

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
    stubGlobals(form)

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
    globalThis.addEventListener = vi.fn()
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

  test('re-enables all selects when the page is restored from the back/forward cache', () => {
    let pageshowHandler
    const sortSelect = { id: 'sort', addEventListener: vi.fn(), disabled: true }
    const materialSelect = {
      id: 'filter',
      addEventListener: vi.fn(),
      disabled: true
    }
    const form = {
      addEventListener: vi.fn(),
      querySelectorAll: vi.fn(() => [sortSelect, materialSelect])
    }
    globalThis.document = { querySelector: vi.fn(() => form) }
    globalThis.sessionStorage = buildSessionStorage()
    globalThis.addEventListener = vi.fn((event, handler) => {
      if (event === 'pageshow') pageshowHandler = handler
    })

    initPrnsSortFilter()
    pageshowHandler({ persisted: true })

    expect(sortSelect.disabled).toBe(false)
    expect(materialSelect.disabled).toBe(false)
  })

  test('does not touch selects on an ordinary (non-persisted) pageshow', () => {
    let pageshowHandler
    const select = { id: 'sort', addEventListener: vi.fn(), disabled: true }
    const form = {
      addEventListener: vi.fn(),
      querySelectorAll: vi.fn(() => [select])
    }
    globalThis.document = { querySelector: vi.fn(() => form) }
    globalThis.sessionStorage = buildSessionStorage()
    globalThis.addEventListener = vi.fn((event, handler) => {
      if (event === 'pageshow') pageshowHandler = handler
    })

    initPrnsSortFilter()
    pageshowHandler({ persisted: false })

    expect(select.disabled).toBe(true)
  })
})
