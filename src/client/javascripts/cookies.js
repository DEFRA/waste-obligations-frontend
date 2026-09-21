import {
  CONSENT_COOKIE_NAME,
  getGa4TagId,
  getGtmKey,
  isGoogleAnalyticsCookie
} from '../../config/cookie-config.js'

const HTTP_OK = 200
const HTTP_MULTIPLE_CHOICES = 300
const ANALYTICS_SCRIPT_SELECTOR =
  'script[src*="googletagmanager.com/gtm.js"], script[src*="googletagmanager.com/gtag/js"]'

export function buildDeletableDomains(hostname) {
  const domains = new Set()

  domains.add(hostname)
  domains.add(`.${hostname}`)

  const parts = hostname.split('.')

  for (let i = 1; i < parts.length - 1; i += 1) {
    domains.add(`.${parts.slice(i).join('.')}`)
  }

  return domains
}

function analyticsCookieExpiryPaths() {
  const paths = new Set(['/'])
  const configured = getAnalyticsCookiePath()

  if (configured) {
    paths.add(configured)

    if (configured !== '/') {
      paths.add(`${configured}/`)
    }
  }

  const pathname = globalThis.location?.pathname

  if (typeof pathname === 'string' && pathname.startsWith('/')) {
    paths.add(pathname)

    const withoutTrailingSlash = pathname.replace(/\/+$/, '') || '/'
    paths.add(withoutTrailingSlash)

    const lastSlash = withoutTrailingSlash.lastIndexOf('/')
    const directory =
      lastSlash <= 0 ? '/' : withoutTrailingSlash.slice(0, lastSlash)

    paths.add(directory)
    paths.add(`${directory}/`)
  }

  return [...paths]
}

function expireCookie(name, path, domain) {
  const attributes = [`path=${path}`]

  if (domain) {
    attributes.push(`domain=${domain}`)
  }

  const expiry = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;${attributes.join(';')}`
  document.cookie = expiry

  if (globalThis.location?.protocol === 'https:') {
    document.cookie = `${expiry};secure`
  }
}

export function deleteGoogleAnalyticsCookies() {
  const allCookies = document.cookie.split(';')
  const hostname = globalThis.location.hostname
  const domains = [undefined, ...buildDeletableDomains(hostname)]
  const paths = analyticsCookieExpiryPaths()

  for (const cookie of allCookies) {
    const cookieName = cookie.split('=')[0].trim()

    if (!isGoogleAnalyticsCookie(cookieName)) {
      continue
    }

    for (const path of paths) {
      for (const domain of domains) {
        expireCookie(cookieName, path, domain)
      }
    }
  }
}

export function readConsentPolicy(
  cookieString,
  cookieName = getConfiguredConsentCookieName()
) {
  const prefix = `${cookieName}=`
  const cookie = String(cookieString ?? '')
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix))

  if (!cookie) {
    return null
  }

  try {
    return JSON.parse(
      globalThis.atob(decodeURIComponent(cookie.slice(prefix.length)))
    )
  } catch {
    return null
  }
}

export function getConfiguredConsentCookieName() {
  const configuredName = globalThis.document?.querySelector?.(
    '.js-cookie-consent-config'
  )?.dataset?.consentCookieName

  return configuredName || CONSENT_COOKIE_NAME
}

export function getAnalyticsCookiePath() {
  return (
    globalThis.document?.querySelector?.('.js-cookie-consent-config')?.dataset
      ?.analyticsCookiePath || '/'
  )
}

export function hasAcceptedAnalytics(
  cookieString = document.cookie,
  cookieName = getConfiguredConsentCookieName()
) {
  const policy = readConsentPolicy(cookieString, cookieName)

  return Boolean(policy?.confirmed && policy?.analytics)
}

function appendAnalyticsScript(src) {
  const script = document.createElement('script')
  script.async = true
  script.src = src

  const nonce = document.querySelector('script[nonce]')?.nonce
  if (nonce) {
    script.nonce = nonce
  }

  document.head.appendChild(script)
}

function applyAnalyticsCookiePath() {
  globalThis.gtag('set', { cookie_path: getAnalyticsCookiePath() })
}

function loadGoogleTagManager(gtmKey) {
  applyAnalyticsCookiePath()
  globalThis.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' })
  appendAnalyticsScript(`https://www.googletagmanager.com/gtm.js?id=${gtmKey}`)
}

function createGtagQueue() {
  return function gtag() {
    // Google's tag snippet requires Arguments objects in dataLayer. Rest
    // parameters would push arrays and skip GA4 initialization.
    globalThis.dataLayer.push(arguments) // NOSONAR
  }
}

function loadGoogleAnalytics4(tagId) {
  applyAnalyticsCookiePath()
  globalThis.gtag('js', new Date())
  globalThis.gtag('config', tagId)
  appendAnalyticsScript(`https://www.googletagmanager.com/gtag/js?id=${tagId}`)
}

export function loadGoogleAnalytics(gtmKey, measurementId) {
  const normalisedGtmKey = getGtmKey(gtmKey)
  const tagId = getGa4TagId(measurementId)

  if (!normalisedGtmKey && !tagId) {
    return
  }

  globalThis.dataLayer = globalThis.dataLayer || []

  if (typeof globalThis.gtag !== 'function') {
    globalThis.gtag = createGtagQueue()
  }

  if (normalisedGtmKey) {
    loadGoogleTagManager(normalisedGtmKey)
  }

  if (tagId) {
    loadGoogleAnalytics4(tagId)
  }
}

export function setupBfcacheGuard() {
  globalThis.addEventListener('pageshow', (event) => {
    if (!event.persisted) {
      return
    }

    if (
      !hasAcceptedAnalytics(document.cookie, getConfiguredConsentCookieName())
    ) {
      deleteGoogleAnalyticsCookies()
    }

    globalThis.location.reload()
  })
}

export function cleanupStaleCookies() {
  const cookieContainer = document.querySelector('.js-cookies-container')

  if (cookieContainer) {
    return
  }

  if (hasAcceptedAnalytics()) {
    return
  }

  const analyticsScript = document.querySelector(ANALYTICS_SCRIPT_SELECTOR)

  if (!analyticsScript) {
    deleteGoogleAnalyticsCookies()
  }
}

function showBanner(banner) {
  const questionBanner = document.querySelector('.js-question-banner')
  questionBanner?.setAttribute('hidden', 'hidden')
  banner.removeAttribute('hidden')
  banner.setAttribute('tabindex', '-1')
  banner.focus()

  banner.addEventListener('blur', () => {
    banner.removeAttribute('tabindex')
  })
}

const formsSubmittedViaFallback = new WeakSet()

function submitFormWithAnalytics(formElement, accepted) {
  if (!formElement || formsSubmittedViaFallback.has(formElement)) {
    return
  }

  formsSubmittedViaFallback.add(formElement)

  let analyticsInput = formElement.querySelector(
    'input[type="hidden"][name="analytics"]'
  )

  if (!analyticsInput) {
    analyticsInput = document.createElement('input')
    analyticsInput.type = 'hidden'
    analyticsInput.name = 'analytics'
    formElement.appendChild(analyticsInput)
  }

  analyticsInput.value = String(accepted)
  formElement.submit()
}

function submitPreference(formElement, csrfName, crumb, accepted) {
  const xhr = new globalThis.XMLHttpRequest()

  xhr.open('POST', formElement.action, true)
  xhr.setRequestHeader('Content-Type', 'application/json')

  xhr.onload = () => {
    if (xhr.status < HTTP_OK || xhr.status >= HTTP_MULTIPLE_CHOICES) {
      submitFormWithAnalytics(formElement, accepted)
    }
  }

  xhr.onerror = () => {
    submitFormWithAnalytics(formElement, accepted)
  }

  xhr.send(
    JSON.stringify({
      analytics: accepted,
      async: true,
      [csrfName]: crumb
    })
  )
}

export function setupCookieComponentListeners() {
  const cookieContainer = document.querySelector('.js-cookies-container')

  if (!cookieContainer) {
    return
  }

  const acceptButton = document.querySelector('.js-cookies-button-accept')
  const rejectButton = document.querySelector('.js-cookies-button-reject')
  const acceptedBanner = document.querySelector('.js-cookies-accepted')
  const rejectedBanner = document.querySelector('.js-cookies-rejected')
  const cookieBanner = document.querySelector('.js-cookies-banner')
  const formElement = cookieContainer.closest('form')
  const crumb = cookieContainer.dataset.crumb
  const csrfName = cookieContainer.dataset.csrfName
  const gtmKey = cookieContainer.dataset.gtmKey
  const measurementId = cookieContainer.dataset.measurementId

  acceptButton?.addEventListener('click', (event) => {
    event.preventDefault()
    showBanner(acceptedBanner)
    loadGoogleAnalytics(gtmKey, measurementId)
    submitPreference(formElement, csrfName, crumb, true)
  })

  rejectButton?.addEventListener('click', (event) => {
    event.preventDefault()
    showBanner(rejectedBanner)
    deleteGoogleAnalyticsCookies()
    submitPreference(formElement, csrfName, crumb, false)
  })

  acceptedBanner?.querySelector('.js-hide')?.addEventListener('click', () => {
    cookieBanner?.setAttribute('hidden', 'hidden')
  })

  rejectedBanner?.querySelector('.js-hide')?.addEventListener('click', () => {
    cookieBanner?.setAttribute('hidden', 'hidden')
  })
}

export function initCookieBanner() {
  setupCookieComponentListeners()
  cleanupStaleCookies()
  setupBfcacheGuard()
}
