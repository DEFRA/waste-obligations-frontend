import { withForwardedPrefix } from '#/server/common/helpers/proxy/forwarded-prefix.js'

export function buildLanguageSwitcherUrls(request) {
  const path = request?.path ?? '/'
  const externalPath = withForwardedPrefix(request, path)
  const search = new URLSearchParams(
    String(request?.url?.search ?? '').replace(/^\?/, '')
  )

  search.set('lang', 'en')
  const enSearch = search.toString()
  search.set('lang', 'cy')
  const cySearch = search.toString()

  return {
    en: enSearch ? `${externalPath}?${enSearch}` : `${externalPath}?lang=en`,
    cy: cySearch ? `${externalPath}?${cySearch}` : `${externalPath}?lang=cy`
  }
}
