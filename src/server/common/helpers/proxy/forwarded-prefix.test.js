import {
  applyForwardedPrefixToCookiePath,
  getForwardedPrefix,
  withForwardedPrefix
} from './forwarded-prefix.js'

function createRequest(prefix) {
  return {
    headers: prefix === undefined ? {} : { 'x-forwarded-prefix': prefix }
  }
}

describe('forwarded prefix helpers', () => {
  test('returns a valid proxy prefix without trailing slashes', () => {
    expect(
      getForwardedPrefix(createRequest('/manage-recycling-obligations///'))
    ).toBe('/manage-recycling-obligations')
  })

  test.each([
    undefined,
    '',
    '/',
    'manage-recycling-obligations',
    '//manage-recycling-obligations',
    '/manage-recycling-obligations/..',
    '/manage-recycling-obligations?lang=cy',
    '/manage-recycling-obligations, /another-path'
  ])('ignores an invalid forwarded prefix: %s', (prefix) => {
    expect(getForwardedPrefix(createRequest(prefix))).toBe('')
  })

  test('adds the prefix to application-local rooted paths', () => {
    const request = createRequest('/manage-recycling-obligations')

    expect(withForwardedPrefix(request, '/signin-oidc?lang=cy')).toBe(
      '/manage-recycling-obligations/signin-oidc?lang=cy'
    )
  })

  test('does not alter external or protocol-relative URLs', () => {
    const request = createRequest('/manage-recycling-obligations')

    expect(withForwardedPrefix(request, 'https://example.com/sign-in')).toBe(
      'https://example.com/sign-in'
    )
    expect(withForwardedPrefix(request, '//example.com/sign-in')).toBe(
      '//example.com/sign-in'
    )
  })

  test('scopes a cookie to the proxy prefix', () => {
    const definition = { path: '/' }

    applyForwardedPrefixToCookiePath(
      definition,
      createRequest('/manage-recycling-obligations')
    )

    expect(definition.path).toBe('/manage-recycling-obligations')
  })

  test('preserves the cookie path for direct and invalid proxy requests', () => {
    const directDefinition = { path: '/' }
    const invalidDefinition = { path: '/' }

    applyForwardedPrefixToCookiePath(directDefinition, createRequest())
    applyForwardedPrefixToCookiePath(
      invalidDefinition,
      createRequest('https://attacker.example')
    )

    expect(directDefinition.path).toBe('/')
    expect(invalidDefinition.path).toBe('/')
  })
})
