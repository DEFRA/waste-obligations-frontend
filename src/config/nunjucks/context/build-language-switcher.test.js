import { buildLanguageSwitcherUrls } from './build-language-switcher.js'

describe('#buildLanguageSwitcherUrls', () => {
  test('builds English and Welsh links preserving the current path', () => {
    expect(
      buildLanguageSwitcherUrls({
        path: '/compliance/producer/org-1/certificate',
        url: { search: '?year=2026' }
      })
    ).toEqual({
      en: '/compliance/producer/org-1/certificate?year=2026&lang=en',
      cy: '/compliance/producer/org-1/certificate?year=2026&lang=cy'
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
        path: '/compliance/producer/org-1/certificate',
        url: { search: '' }
      })
    ).toEqual({
      en: '/compliance/producer/org-1/certificate?lang=en',
      cy: '/compliance/producer/org-1/certificate?lang=cy'
    })
  })

  test('prefixes links for a reverse proxy', () => {
    expect(
      buildLanguageSwitcherUrls({
        path: '/signed-out',
        url: { search: '' },
        headers: { 'x-forwarded-prefix': '/manage-recycling-obligations' }
      })
    ).toEqual({
      en: '/manage-recycling-obligations/signed-out?lang=en',
      cy: '/manage-recycling-obligations/signed-out?lang=cy'
    })
  })
})
