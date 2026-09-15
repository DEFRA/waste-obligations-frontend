import { validatePublicOrigin } from './auth-public-origin.js'

describe('authentication public origin', () => {
  test.each([
    'http://localhost:3000',
    'https://localhost:8015/',
    'https://service.example.gov.uk',
    'http://[::1]:3000'
  ])('accepts %s', (value) => {
    expect(() => validatePublicOrigin(value)).not.toThrow()
  })

  test.each([
    '',
    'not-a-url',
    '/signin-oidc',
    'ftp://example.com',
    'https://user:password@example.com',
    'https://example.com/path',
    'https://example.com?query=1',
    'https://example.com#fragment',
    'https://example.com\\\\evil',
    'https://example.com\n'
  ])('rejects %s', (value) => {
    expect(() => validatePublicOrigin(value)).toThrow()
  })
})
