import { CONSENT_COOKIE_NAME, getGa4TagId } from '../../config/cookie-config.js'

const GA_COOKIE_PREFIXES = ['_ga', '_gid', '_gat', '_dc_gtm_']
const GTM_KEY_PATTERN = /^GTM-[A-Z0-9]+$/
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

export function deleteGoogleAnalyticsCookies() {
  const allCookies = document.cookie.split(';')
  const hostname = globalThis.location.hostname
  const domains = buildDeletableDomains(hostname)

  for (const cookie of allCookies) {
    const cookieName = cookie.split('=')[0].trim()
    const isGaCookie = GA_COOKIE_PREFIXES.some((prefix) =>
      cookieName.startsWith(prefix)
    )

    if (isGaCookie) {
      document.cookie = `${cookieName}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`

      for (const domain of domains) {
        document.cookie = `${cookieName}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${domain}`
      }
    }
  }
}

export function readConsentPolicy(
  cookieString,
  cookieName = CONSENT_COOKIE_NAME
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

export function hasAcceptedAnalytics(
  cookieString = document.cookie,
  cookieName = CONSENT_COOKIE_NAME
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

function loadGoogleTagManager(gtmKey) {
  globalThis.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' })
  appendAnalyticsScript(`https://www.googletagmanager.com/gtm.js?id=${gtmKey}`)
}

function createGtagQueue() {
  return function gtag() {
    // Google's tag snippet requires Arguments objects in dataLayer, not arrays.
    globalThis.dataLayer.push(arguments)
  }
}

function loadGoogleAnalytics4(tagId) {
  if (typeof globalThis.gtag !== 'function') {
    globalThis.gtag = createGtagQueue()
  }

  globalThis.gtag('js', new Date())
  globalThis.gtag('config', tagId)
  appendAnalyticsScript(`https://www.googletagmanager.com/gtag/js?id=${tagId}`)
}

export function loadGoogleAnalytics(gtmKey, measurementId) {
  const hasGtm = Boolean(gtmKey && GTM_KEY_PATTERN.test(gtmKey))
  const tagId = getGa4TagId(measurementId)

  if (!hasGtm && !tagId) {
    return
  }

  globalThis.dataLayer = globalThis.dataLayer || []

  if (hasGtm) {
    loadGoogleTagManager(gtmKey)
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

    if (!hasAcceptedAnalytics()) {
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

function submitPreference(formElement, csrfName, crumb, accepted, onSuccess) {
  const xhr = new globalThis.XMLHttpRequest()

  xhr.open('POST', formElement.action, true)
  xhr.setRequestHeader('Content-Type', 'application/json')

  xhr.onload = () => {
    if (xhr.status >= HTTP_OK && xhr.status < HTTP_MULTIPLE_CHOICES) {
      onSuccess()
    } else {
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
    submitPreference(formElement, csrfName, crumb, true, () => {})
  })

  rejectButton?.addEventListener('click', (event) => {
    event.preventDefault()
    showBanner(rejectedBanner)
    deleteGoogleAnalyticsCookies()
    submitPreference(formElement, csrfName, crumb, false, () => {})
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
