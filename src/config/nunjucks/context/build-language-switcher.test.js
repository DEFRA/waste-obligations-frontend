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
})
