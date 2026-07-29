import { getNonPrefixedServiceLinkHrefs } from './proxy-link-assertions.js'

describe('getNonPrefixedServiceLinkHrefs', () => {
  test('finds service-local links that omit the proxy prefix', () => {
    const html = [
      '<a href="/signin-oidc">Sign in</a>',
      '<a href="certificate/submit">Continue</a>',
      '<a href="/manage-recycling-obligations/cookies">Cookies</a>',
      '<a href="https://other.example/service">Other service</a>',
      '<a href="#summary">Summary</a>',
      '<a href="?lang=cy">Cymraeg</a>'
    ].join('')

    expect(
      getNonPrefixedServiceLinkHrefs(html, '/manage-recycling-obligations')
    ).toEqual(['/signin-oidc', 'certificate/submit'])
  })
})
