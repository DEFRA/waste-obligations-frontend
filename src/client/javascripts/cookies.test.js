import { describe, expect, test, vi, afterEach } from 'vitest'

import {
  buildDeletableDomains,
  cleanupStaleCookies,
  deleteGoogleAnalyticsCookies,
  initCookieBanner,
  loadGoogleAnalytics,
  setupBfcacheGuard,
  setupCookieComponentListeners
} from './cookies.js'

function setupBrowserGlobals({
  cookieString = '_ga=GA1.1.123.456',
  hostname = 'service.example.gov.uk',
  banner = null
} = {}) {
  const reloadSpy = vi.fn()
  const addEventListenerStub = vi.fn()
  let cookies = cookieString
  const createdScripts = []
  const appendChild = vi.fn((script) => createdScripts.push(script))

  globalThis.addEventListener = addEventListenerStub
  globalThis.XMLHttpRequest = vi.fn()
  globalThis.dataLayer = undefined

  Object.defineProperty(globalThis, 'location', {
    value: { hostname, reload: reloadSpy },
    writable: true,
    configurable: true
  })

  Object.defineProperty(globalThis, 'document', {
    value: {
      get cookie() {
        return cookies
      },
      set cookie(value) {
        if (value.includes('expires=Thu, 01 Jan 1970')) {
          const name = value.split('=')[0]
          cookies = cookies
            .split(';')
            .map((part) => part.trim())
            .filter((part) => part && !part.startsWith(`${name}=`))
            .join('; ')
        }
      },
      querySelector: vi.fn((selector) => {
        if (selector === '.js-cookies-container') return banner
        if (selector === '.js-cookies-button-accept') {
          return banner?.acceptButton ?? null
        }
        if (selector === '.js-cookies-button-reject') {
          return banner?.rejectButton ?? null
        }
        if (selector === '.js-cookies-accepted') {
          return banner?.acceptedBanner ?? null
        }
        if (selector === '.js-cookies-rejected') {
          return banner?.rejectedBanner ?? null
        }
        if (selector === '.js-cookies-banner') {
          return banner?.cookieBanner ?? null
        }
        if (selector === '.js-question-banner') {
          return banner?.questionBanner ?? null
        }
        if (
          selector.includes('googletagmanager.com/gtm.js') ||
          selector.includes('googletagmanager.com/gtag/js')
        ) {
          return banner?.gtmScript ?? banner?.ga4Script ?? null
        }
        if (selector === 'script[nonce]') {
          return banner?.nonceScript ?? { nonce: 'test-nonce' }
        }

        return null
      }),
      createElement: vi.fn(() => ({ async: false, src: '' })),
      head: { appendChild }
    },
    writable: true,
    configurable: true
  })

  return { addEventListenerStub, reloadSpy, createdScripts, appendChild }
}

describe('client cookies', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    delete globalThis.addEventListener
    delete globalThis.document
    delete globalThis.location
    delete globalThis.XMLHttpRequest
    delete globalThis.dataLayer
    delete globalThis.gtag
  })

  test('buildDeletableDomains includes host and parent domains', () => {
    expect([...buildDeletableDomains('service.example.gov.uk')]).toEqual(
      expect.arrayContaining([
        'service.example.gov.uk',
        '.service.example.gov.uk',
        '.example.gov.uk'
      ])
    )
  })

  test('deleteGoogleAnalyticsCookies expires matching cookies', () => {
    setupBrowserGlobals()

    expect(globalThis.document.cookie).toContain('_ga')

    deleteGoogleAnalyticsCookies()

    expect(globalThis.document.cookie).toBe('')
  })

  test('deleteGoogleAnalyticsCookies leaves non-GA cookies', () => {
    setupBrowserGlobals({
      cookieString: '_ga=GA1.1.123.456; waste-obligations-session=abc'
    })

    deleteGoogleAnalyticsCookies()

    expect(globalThis.document.cookie).toContain('waste-obligations-session')
    expect(globalThis.document.cookie).not.toContain('_ga=')
  })

  test('loadGoogleAnalytics ignores invalid keys', () => {
    const { appendChild } = setupBrowserGlobals()

    loadGoogleAnalytics('not-a-gtm-key')
    loadGoogleAnalytics('')
    loadGoogleAnalytics('', 'not-a-measurement-id')

    expect(appendChild).not.toHaveBeenCalled()
  })

  test('loadGoogleAnalytics injects the GTM script for a valid key', () => {
    const { appendChild, createdScripts } = setupBrowserGlobals()

    loadGoogleAnalytics('GTM-ABC123')

    expect(globalThis.dataLayer[0].event).toBe('gtm.js')
    expect(createdScripts[0].src).toBe(
      'https://www.googletagmanager.com/gtm.js?id=GTM-ABC123'
    )
    expect(createdScripts[0].nonce).toBe('test-nonce')
    expect(appendChild).toHaveBeenCalledOnce()
  })

  test('loadGoogleAnalytics injects gtag.js for a valid measurement ID', () => {
    const { appendChild, createdScripts } = setupBrowserGlobals()

    loadGoogleAnalytics('', 'G-VMDE8PW9W7')

    expect(createdScripts[0].src).toBe(
      'https://www.googletagmanager.com/gtag/js?id=G-VMDE8PW9W7'
    )
    expect(createdScripts[0].nonce).toBe('test-nonce')
    expect(globalThis.dataLayer).toEqual(
      expect.arrayContaining([['config', 'G-VMDE8PW9W7']])
    )
    expect(appendChild).toHaveBeenCalledOnce()
  })

  test('loadGoogleAnalytics reuses an existing gtag function', () => {
    const { createdScripts } = setupBrowserGlobals()
    const existingGtag = vi.fn()
    globalThis.gtag = existingGtag

    loadGoogleAnalytics('', 'G-VMDE8PW9W7')

    expect(existingGtag).toHaveBeenCalledWith('config', 'G-VMDE8PW9W7')
    expect(createdScripts[0].src).toBe(
      'https://www.googletagmanager.com/gtag/js?id=G-VMDE8PW9W7'
    )
  })

  test('loadGoogleAnalytics injects GTM and GA4 when both IDs are valid', () => {
    const { appendChild, createdScripts } = setupBrowserGlobals()

    loadGoogleAnalytics('GTM-ABC123', 'VMDE8PW9W7')

    expect(createdScripts.map((script) => script.src)).toEqual([
      'https://www.googletagmanager.com/gtm.js?id=GTM-ABC123',
      'https://www.googletagmanager.com/gtag/js?id=G-VMDE8PW9W7'
    ])
    expect(appendChild).toHaveBeenCalledTimes(2)
  })

  test('loadGoogleAnalytics omits nonce when the page script has none', () => {
    const { appendChild, createdScripts } = setupBrowserGlobals()
    globalThis.document.querySelector = vi.fn(() => null)

    loadGoogleAnalytics('GTM-ABC123')

    expect(createdScripts[0].nonce).toBeUndefined()
    expect(appendChild).toHaveBeenCalledOnce()
  })

  test('cleanupStaleCookies leaves cookies alone while the banner is visible', () => {
    setupBrowserGlobals({ banner: { dataset: {} } })

    cleanupStaleCookies()

    expect(globalThis.document.cookie).toContain('_ga')
  })

  test('cleanupStaleCookies removes GA cookies when GTM is not loaded', () => {
    setupBrowserGlobals({ banner: null })

    cleanupStaleCookies()

    expect(globalThis.document.cookie).toBe('')
  })

  test('cleanupStaleCookies keeps GA cookies when GTM is already loaded', () => {
    setupBrowserGlobals({
      banner: null
    })
    globalThis.document.querySelector = vi.fn((selector) => {
      if (selector === '.js-cookies-container') return null
      if (selector.includes('googletagmanager.com/gtm.js')) {
        return { src: 'https://www.googletagmanager.com/gtm.js?id=GTM-ABC123' }
      }

      return null
    })

    cleanupStaleCookies()

    expect(globalThis.document.cookie).toContain('_ga')
  })

  test('cleanupStaleCookies keeps GA cookies when gtag.js is already loaded', () => {
    setupBrowserGlobals({
      banner: null
    })
    globalThis.document.querySelector = vi.fn((selector) => {
      if (selector === '.js-cookies-container') return null
      if (selector.includes('googletagmanager.com/gtag/js')) {
        return {
          src: 'https://www.googletagmanager.com/gtag/js?id=G-VMDE8PW9W7'
        }
      }

      return null
    })

    cleanupStaleCookies()

    expect(globalThis.document.cookie).toContain('_ga')
  })

  test('setupBfcacheGuard reloads persisted pages after clearing GA cookies', () => {
    const { addEventListenerStub, reloadSpy } = setupBrowserGlobals()

    setupBfcacheGuard()

    const [, listener] = addEventListenerStub.mock.calls.find(
      ([event]) => event === 'pageshow'
    )
    listener({ persisted: true })

    expect(globalThis.document.cookie).toBe('')
    expect(reloadSpy).toHaveBeenCalledOnce()
  })

  test('setupBfcacheGuard does not reload a normal page load', () => {
    const { addEventListenerStub, reloadSpy } = setupBrowserGlobals()

    setupBfcacheGuard()

    const [, listener] = addEventListenerStub.mock.calls.find(
      ([event]) => event === 'pageshow'
    )
    listener({ persisted: false })

    expect(reloadSpy).not.toHaveBeenCalled()
  })

  test('initCookieBanner wires listeners when the banner is present', () => {
    const acceptButton = { addEventListener: vi.fn() }
    const rejectButton = { addEventListener: vi.fn() }
    const hideButton = { addEventListener: vi.fn() }
    const acceptedBanner = {
      querySelector: vi.fn(() => hideButton),
      addEventListener: vi.fn(),
      removeAttribute: vi.fn(),
      setAttribute: vi.fn(),
      focus: vi.fn()
    }
    const formElement = { action: '/cookies', submit: vi.fn() }
    const banner = {
      dataset: {
        crumb: 'token',
        csrfName: 'waste-obligations-csrf',
        gtmKey: 'GTM-ABC123'
      },
      closest: vi.fn(() => formElement),
      acceptButton,
      rejectButton,
      acceptedBanner,
      rejectedBanner: acceptedBanner,
      cookieBanner: { setAttribute: vi.fn() },
      questionBanner: { setAttribute: vi.fn() }
    }

    setupBrowserGlobals({ banner })

    initCookieBanner()

    expect(acceptButton.addEventListener).toHaveBeenCalledWith(
      'click',
      expect.any(Function)
    )
    expect(rejectButton.addEventListener).toHaveBeenCalledWith(
      'click',
      expect.any(Function)
    )
  })

  test('accept click loads GTM and posts consent', () => {
    const xhr = {
      open: vi.fn(),
      setRequestHeader: vi.fn(),
      send: vi.fn()
    }
    const acceptButton = { addEventListener: vi.fn() }
    const formElement = { action: '/cookies', submit: vi.fn() }
    const acceptedBanner = {
      querySelector: vi.fn(() => ({ addEventListener: vi.fn() })),
      addEventListener: vi.fn(),
      removeAttribute: vi.fn(),
      setAttribute: vi.fn(),
      focus: vi.fn()
    }
    const banner = {
      dataset: {
        crumb: 'token',
        csrfName: 'waste-obligations-csrf',
        gtmKey: 'GTM-ABC123',
        measurementId: 'G-VMDE8PW9W7'
      },
      closest: vi.fn(() => formElement),
      acceptButton,
      rejectButton: { addEventListener: vi.fn() },
      acceptedBanner,
      rejectedBanner: {
        querySelector: vi.fn(() => ({ addEventListener: vi.fn() }))
      },
      cookieBanner: { setAttribute: vi.fn() },
      questionBanner: { setAttribute: vi.fn() }
    }

    const { createdScripts } = setupBrowserGlobals({ banner })
    globalThis.XMLHttpRequest = function XmlHttpRequest() {
      return xhr
    }

    setupCookieComponentListeners()

    const [, clickHandler] = acceptButton.addEventListener.mock.calls[0]
    clickHandler({ preventDefault: vi.fn() })

    expect(xhr.open).toHaveBeenCalledWith('POST', '/cookies', true)
    expect(xhr.send).toHaveBeenCalledWith(
      JSON.stringify({
        analytics: true,
        async: true,
        'waste-obligations-csrf': 'token'
      })
    )
    expect(globalThis.dataLayer[0].event).toBe('gtm.js')
    expect(createdScripts.map((script) => script.src)).toEqual([
      'https://www.googletagmanager.com/gtm.js?id=GTM-ABC123',
      'https://www.googletagmanager.com/gtag/js?id=G-VMDE8PW9W7'
    ])

    xhr.status = 200
    xhr.onload()
    expect(formElement.submit).not.toHaveBeenCalled()

    xhr.status = 500
    xhr.onload()
    expect(formElement.submit).toHaveBeenCalledOnce()
  })

  test('falls back to a native form post when XHR fails', () => {
    const xhr = {
      open: vi.fn(),
      setRequestHeader: vi.fn(),
      send: vi.fn()
    }
    const rejectButton = { addEventListener: vi.fn() }
    const formElement = { action: '/cookies', submit: vi.fn() }
    const rejectedBanner = {
      querySelector: vi.fn(() => ({ addEventListener: vi.fn() })),
      addEventListener: vi.fn(),
      removeAttribute: vi.fn(),
      setAttribute: vi.fn(),
      focus: vi.fn()
    }
    const banner = {
      dataset: {
        crumb: 'token',
        csrfName: 'waste-obligations-csrf',
        gtmKey: ''
      },
      closest: vi.fn(() => formElement),
      acceptButton: { addEventListener: vi.fn() },
      rejectButton,
      acceptedBanner: {
        querySelector: vi.fn(() => ({ addEventListener: vi.fn() }))
      },
      rejectedBanner,
      cookieBanner: { setAttribute: vi.fn() },
      questionBanner: { setAttribute: vi.fn() }
    }

    setupBrowserGlobals({ banner })
    globalThis.XMLHttpRequest = function XmlHttpRequest() {
      return xhr
    }

    setupCookieComponentListeners()

    const [, clickHandler] = rejectButton.addEventListener.mock.calls[0]
    clickHandler({ preventDefault: vi.fn() })
    xhr.onerror()

    expect(formElement.submit).toHaveBeenCalledOnce()
  })

  test('setupCookieComponentListeners returns when the banner is missing', () => {
    setupBrowserGlobals({ banner: null })

    expect(() => setupCookieComponentListeners()).not.toThrow()
  })

  test('hide buttons dismiss the confirmation banner', () => {
    const hideButton = { addEventListener: vi.fn() }
    const cookieBanner = { setAttribute: vi.fn() }
    const acceptedBanner = {
      querySelector: vi.fn(() => hideButton),
      addEventListener: vi.fn(),
      removeAttribute: vi.fn(),
      setAttribute: vi.fn(),
      focus: vi.fn()
    }
    const banner = {
      dataset: { crumb: 'token', csrfName: 'csrf', gtmKey: '' },
      closest: vi.fn(() => ({ action: '/cookies', submit: vi.fn() })),
      acceptButton: { addEventListener: vi.fn() },
      rejectButton: { addEventListener: vi.fn() },
      acceptedBanner,
      rejectedBanner: acceptedBanner,
      cookieBanner,
      questionBanner: { setAttribute: vi.fn() }
    }

    setupBrowserGlobals({ banner })
    setupCookieComponentListeners()

    expect(hideButton.addEventListener).toHaveBeenCalledTimes(2)
    hideButton.addEventListener.mock.calls.forEach(([, hideHandler]) => {
      hideHandler()
    })

    expect(cookieBanner.setAttribute).toHaveBeenCalledWith('hidden', 'hidden')
  })

  test('confirmation banner blur removes tabindex', () => {
    const xhr = {
      open: vi.fn(),
      setRequestHeader: vi.fn(),
      send: vi.fn()
    }
    const acceptButton = { addEventListener: vi.fn() }
    const acceptedBanner = {
      querySelector: vi.fn(() => ({ addEventListener: vi.fn() })),
      addEventListener: vi.fn(),
      removeAttribute: vi.fn(),
      setAttribute: vi.fn(),
      focus: vi.fn()
    }
    const banner = {
      dataset: {
        crumb: 'token',
        csrfName: 'waste-obligations-csrf',
        gtmKey: ''
      },
      closest: vi.fn(() => ({ action: '/cookies', submit: vi.fn() })),
      acceptButton,
      rejectButton: { addEventListener: vi.fn() },
      acceptedBanner,
      rejectedBanner: {
        querySelector: vi.fn(() => ({ addEventListener: vi.fn() }))
      },
      cookieBanner: { setAttribute: vi.fn() },
      questionBanner: { setAttribute: vi.fn() }
    }

    setupBrowserGlobals({ banner })
    globalThis.XMLHttpRequest = function XmlHttpRequest() {
      return xhr
    }

    setupCookieComponentListeners()
    const [, clickHandler] = acceptButton.addEventListener.mock.calls[0]
    clickHandler({ preventDefault: vi.fn() })

    const [, blurHandler] = acceptedBanner.addEventListener.mock.calls.find(
      ([event]) => event === 'blur'
    )
    blurHandler()

    expect(acceptedBanner.removeAttribute).toHaveBeenCalledWith('tabindex')
  })
})
