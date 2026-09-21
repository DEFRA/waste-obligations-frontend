import path from 'node:path'
import { readFileSync } from 'node:fs'

import { config } from '#/config/config.js'
import { getGa4TagId, getGtmKey } from '#/config/cookie-config.js'
import {
  getConsentCookieName,
  getCurrentPolicy,
  isGoogleAnalyticsEnabled
} from '#/server/common/helpers/cookie-consent.js'
import { paths } from '#/config/paths.js'
import { buildLanguageSwitcherUrls } from './build-language-switcher.js'
import { buildNavigation } from './build-navigation.js'
import { resolveBackLinkHref } from '#/server/common/helpers/navigation/back-link.js'
import { createLogger } from '#/server/common/helpers/logging/logger.js'
import { getLocale } from '#/server/common/helpers/i18n/get-locale.js'
import {
  getAnalyticsCookiePath,
  withForwardedPrefix
} from '#/server/common/helpers/proxy/forwarded-prefix.js'

const logger = createLogger()
const assetPath = config.get('assetPath')
const manifestPath = path.join(
  config.get('root'),
  '.public/.vite/manifest.json'
)

let viteManifest

export function context(request) {
  if (config.get('isProduction') && !viteManifest) {
    try {
      viteManifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
    } catch (error) {
      logger.error(`Vite ${path.basename(manifestPath)} not found`)
    }
  }

  const csrfToken = request.plugins?.crumb
  const scriptNonce = request.plugins?.blankie?.nonces?.script
  const externalAssetPath = withForwardedPrefix(request, assetPath)
  const googleTagManagerKey = getGtmKey(
    config.get('googleAnalytics.googleTagManagerKey')
  )
  const googleAnalyticsMeasurementId = getGa4TagId(
    config.get('googleAnalytics.measurementId')
  )
  const analyticsEnabled = isGoogleAnalyticsEnabled()

  return {
    assetPath: `${externalAssetPath}/assets`,
    cookiesHref: withForwardedPrefix(request, paths.cookies),
    consentCookieName: getConsentCookieName(),
    analyticsCookiePath: getAnalyticsCookiePath(request),
    csrfCookieName: config.get('csrf.cookie.name'),
    analyticsEnabled,
    ...(analyticsEnabled ? { cookiesPolicy: getCurrentPolicy(request) } : {}),
    googleTagManagerKey,
    googleAnalyticsMeasurementId,
    locale: getLocale(request),
    serviceName: config.get('serviceName'),
    serviceUrl: config.get('eprPackaging.homeUrl'),
    eprPackaging: {
      homeUrl: config.get('eprPackaging.homeUrl'),
      accessibilityUrl: config.get('eprPackaging.accessibilityUrl'),
      feedbackUrl: config.get('eprPackaging.feedbackUrl'),
      manageYourRecyclingObligationsUrl: config.get(
        'eprPackaging.manageYourRecyclingObligationsUrl'
      ),
      privacyUrl: config.get('eprPackaging.privacyUrl'),
      supportEmail: config.get('eprPackaging.supportEmail'),
      supportTelephone: config.get('eprPackaging.supportTelephone')
    },
    languageSwitcher: buildLanguageSwitcherUrls(request),
    navigation: buildNavigation(request),
    backLink: request.app?.backLinkHref ?? resolveBackLinkHref(request),
    ...(csrfToken ? { csrfToken } : {}),
    ...(scriptNonce ? { nonce: scriptNonce } : {}),
    getAssetPath(asset) {
      if (!config.get('isProduction')) {
        return `${externalAssetPath}/${asset}`
      }

      const viteAssetPath = viteManifest?.[asset]?.file
      return `${externalAssetPath}/${viteAssetPath ?? asset}`
    }
  }
}
