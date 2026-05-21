import { buildLanguageSwitcherUrls } from './build-language-switcher.js'

describe('#buildLanguageSwitcherUrls', () => {
  test('builds English and Welsh links preserving the current path', () => {
    expect(
      buildLanguageSwitcherUrls({
        path: '/compliance/org-1/certificate',
        url: { search: '?year=2026' }
      })
    ).toEqual({
      en: '/compliance/org-1/certificate?year=2026&lang=en',
      cy: '/compliance/org-1/certificate?year=2026&lang=cy'
    })
  })

  test('defaults to root path and lang-only query when request is absent', () => {
    expect(buildLanguageSwitcherUrls()).toEqual({
      en: '/?lang=en',
      cy: '/?lang=cy'
    })
  })

  test('builds lang-only links when the current URL has no query string', () => {
    expect(
      buildLanguageSwitcherUrls({
        path: '/compliance/org-1/certificate',
        url: { search: '' }
      })
    ).toEqual({
      en: '/compliance/org-1/certificate?lang=en',
      cy: '/compliance/org-1/certificate?lang=cy'
    })
  })
})
