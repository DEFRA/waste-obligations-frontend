import path from 'node:path'
import { readFileSync } from 'node:fs'

import { config } from '#/config/config.js'
import { paths } from '#/config/paths.js'
import { buildLanguageSwitcherUrls } from './build-language-switcher.js'
import { buildNavigation } from './build-navigation.js'
import { resolveBackLinkHref } from '#/server/common/helpers/navigation/back-link.js'
import { createLogger } from '#/server/common/helpers/logging/logger.js'
import { getLocale } from '#/server/common/helpers/i18n/get-locale.js'
import { withForwardedPrefix } from '#/server/common/helpers/proxy/forwarded-prefix.js'

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
  const externalAssetPath = withForwardedPrefix(request, assetPath)

  return {
    assetPath: `${externalAssetPath}/assets`,
    cookiesHref: withForwardedPrefix(request, paths.cookies),
    csrfCookieName: config.get('csrf.cookie.name'),
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
    getAssetPath(asset) {
      if (!config.get('isProduction')) {
        return `${externalAssetPath}/${asset}`
      }

      const viteAssetPath = viteManifest?.[asset]?.file
      return `${externalAssetPath}/${viteAssetPath ?? asset}`
    }
  }
}
