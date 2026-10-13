import { config } from '#/config/config.js'
import { validateAuthenticationHost } from './authentication-host.js'

const defaults = ['.defra.cloud', '.defra.gov.uk']

describe('authentication host validation', () => {
  test('uses the agreed CDP defaults', () => {
    expect(config.get('auth.azureAdB2c.allowedHosts')).toEqual(defaults)
  })

  test.each([
    'app.defra.cloud',
    'a.b.defra.gov.uk',
    'APP.DEFRA.CLOUD:443',
    'app.defra.cloud:8443'
  ])('accepts %s', (host) => {
    expect(validateAuthenticationHost(host, defaults)).toBe(host.toLowerCase())
  })

  test.each([
    undefined,
    null,
    [],
    '',
    'localhost',
    '127.0.0.1',
    '[::1]',
    'defra.cloud',
    'defra.gov.uk',
    'evildefra.cloud',
    'app.defra.cloud.evil.example',
    'a..defra.cloud',
    '-a.defra.cloud',
    'a-.defra.cloud',
    'a.defra.cloud.',
    'https://app.defra.cloud',
    'app.defra.cloud/path',
    'app.defra.cloud?x=1',
    'app.defra.cloud#fragment',
    'app.defra.cloud@evil.example',
    'user@app.defra.cloud',
    'app.defra.cloud,evil.example',
    ' app.defra.cloud',
    'app.defra.cloud\n',
    'app.defra.cloud\\evil',
    'app%2edefra.cloud',
    "app.defra.cloud'",
    'app.defra.cloud:0',
    'app.defra.cloud:65536',
    'app.defra.cloud:abc',
    'app.defra.cloud:',
    `${'a'.repeat(260)}.defra.cloud`,
    `${'a'.repeat(64)}.defra.cloud`,
    `${'a'.repeat(250)}.cloud`
  ])('rejects %j with a safe 400 error', (host) => {
    try {
      validateAuthenticationHost(host, defaults)
      expect.fail('Expected host rejection')
    } catch (error) {
      expect(error.output.statusCode).toBe(400)
      expect(error.message).toBe('Invalid authentication host')
    }
  })

  test.each([
    'localhost',
    'LOCALHOST:8010',
    'localhost:8015',
    'localhost:80',
    'localhost:65535'
  ])('accepts local override %s', (host) => {
    expect(validateAuthenticationHost(host, [' localhost '])).toBe(
      host.toLowerCase()
    )
  })

  test.each([
    'app.defra.cloud',
    'app.defra.gov.uk',
    'sub.localhost',
    'localhost.evil.example'
  ])('local override does not allow %s', (host) => {
    expect(() => validateAuthenticationHost(host, ['localhost'])).toThrow(
      'Invalid authentication host'
    )
  })
})
