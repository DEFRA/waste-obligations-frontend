import {
  AZURE_AD_B2C_AUTH_STRATEGY,
  BELL_AZURE_AD_B2C_COOKIE,
  buildB2cLogoutUrl,
  buildB2cOAuthEndpoint,
  getB2cAuthorityPrefix,
  bellRedirectOrigin,
  resolvePostLogoutAbsoluteUri
} from './azure-ad-b2c.js'

function createRequest(overrides = {}) {
  return {
    headers: overrides.headers ?? {},
    server: {
      info: { protocol: overrides.protocol ?? 'http' }
    },
    info: { host: overrides.host ?? 'localhost:8010' }
  }
}

describe('azure-ad-b2c helpers', () => {
  test('BELL_AZURE_AD_B2C_COOKIE is bell-azure-ad-b2c', () => {
    expect(BELL_AZURE_AD_B2C_COOKIE).toBe('bell-azure-ad-b2c')
  })

  test('AZURE_AD_B2C_AUTH_STRATEGY is azure-ad-b2c', () => {
    expect(AZURE_AD_B2C_AUTH_STRATEGY).toBe('azure-ad-b2c')
  })

  test('buildB2cOAuthEndpoint builds from instance and domain', () => {
    expect(
      buildB2cOAuthEndpoint(
        {
          instance: 'https://tenant.b2clogin.com',
          domain: 'tenant.onmicrosoft.com',
          userFlow: 'B2C_1A_EPR_SignUpSignIn'
        },
        'oauth2/v2.0/authorize'
      )
    ).toBe(
      'https://tenant.b2clogin.com/tenant.onmicrosoft.com/B2C_1A_EPR_SignUpSignIn/oauth2/v2.0/authorize'
    )
  })

  test('buildB2cOAuthEndpoint builds from tenant name when instance is absent', () => {
    expect(
      buildB2cOAuthEndpoint(
        {
          tenantName: 'tenant',
          userFlow: 'B2C_1A_EPR_SignUpSignIn'
        },
        'oauth2/v2.0/token'
      )
    ).toBe(
      'https://tenant.b2clogin.com/tenant.onmicrosoft.com/B2C_1A_EPR_SignUpSignIn/oauth2/v2.0/token'
    )
  })

  test('bellRedirectOrigin returns undefined when redirect URI is missing', () => {
    expect(bellRedirectOrigin('', true)).toBeUndefined()
  })

  test('bellRedirectOrigin keeps http when tls is disabled', () => {
    expect(bellRedirectOrigin('http://localhost:8010/signin-oidc', false)).toBe(
      'http://localhost:8010'
    )
  })

  test('getB2cAuthorityPrefix returns null when config is missing', () => {
    expect(getB2cAuthorityPrefix(null)).toBeNull()
    expect(getB2cAuthorityPrefix({ tenantName: 'tenant' })).toBeNull()
  })

  test('getB2cAuthorityPrefix strips trailing slash from instance', () => {
    expect(
      getB2cAuthorityPrefix({
        instance: 'https://tenant.b2clogin.com/',
        domain: 'tenant.onmicrosoft.com',
        userFlow: 'B2C_1A_EPR_SignUpSignIn'
      })
    ).toBe(
      'https://tenant.b2clogin.com/tenant.onmicrosoft.com/B2C_1A_EPR_SignUpSignIn'
    )
  })

  test('getB2cAuthorityPrefix builds from tenant name and user flow', () => {
    expect(
      getB2cAuthorityPrefix({
        tenantName: 'tenant',
        userFlow: 'B2C_1A_EPR_SignUpSignIn'
      })
    ).toBe(
      'https://tenant.b2clogin.com/tenant.onmicrosoft.com/B2C_1A_EPR_SignUpSignIn'
    )
  })

  test('buildB2cLogoutUrl returns base logout URL without redirect', () => {
    expect(
      buildB2cLogoutUrl(
        'https://tenant.b2clogin.com/tenant.onmicrosoft.com/B2C_1_flow'
      )
    ).toBe(
      'https://tenant.b2clogin.com/tenant.onmicrosoft.com/B2C_1_flow/oauth2/v2.0/logout'
    )
  })

  test('buildB2cLogoutUrl appends post_logout_redirect_uri when provided', () => {
    const url = buildB2cLogoutUrl(
      'https://tenant.b2clogin.com/tenant.onmicrosoft.com/B2C_1_flow',
      'https://app.example.com/signed-out'
    )

    expect(url).toContain('/oauth2/v2.0/logout')
    expect(url).toContain(
      'post_logout_redirect_uri=https%3A%2F%2Fapp.example.com%2Fsigned-out'
    )
  })

  test('bellRedirectOrigin returns origin from full redirect URI', () => {
    expect(bellRedirectOrigin('https://localhost:8010/signin-oidc', true)).toBe(
      'https://localhost:8010'
    )
  })

  test('bellRedirectOrigin builds origin from relative redirect URI', () => {
    expect(
      bellRedirectOrigin('/signin-oidc', false, {
        host: '0.0.0.0',
        port: 8010
      })
    ).toBe('http://localhost:8010')

    expect(
      bellRedirectOrigin('/signin-oidc', false, {
        host: '127.0.0.1',
        port: 3000
      })
    ).toBe('http://127.0.0.1:3000')
  })

  test('bellRedirectOrigin upgrades http to https when tls is enabled', () => {
    expect(
      bellRedirectOrigin('http://localhost:8010/signin-oidc', true, {
        host: 'localhost',
        port: 8010
      })
    ).toBe('https://localhost:8010')
  })

  describe('resolvePostLogoutAbsoluteUri', () => {
    test('upgrades absolute http URLs behind https proxy', () => {
      const uri = resolvePostLogoutAbsoluteUri(
        createRequest({
          headers: { 'x-forwarded-proto': 'https' }
        }),
        'http://localhost:8010/signed-out',
        {}
      )

      expect(uri).toBe('https://localhost:8010/signed-out')
    })

    test('builds URL from azure redirect origin', () => {
      const uri = resolvePostLogoutAbsoluteUri(createRequest(), '/signed-out', {
        redirectUri: 'https://localhost:8010/signin-oidc'
      })

      expect(uri).toBe('https://localhost:8010/signed-out')
    })

    test('builds URL from request host when redirect URI is relative', () => {
      const uri = resolvePostLogoutAbsoluteUri(
        createRequest({
          headers: { host: 'localhost:8010' },
          protocol: 'http'
        }),
        'signed-out',
        { redirectUri: '/signin-oidc' }
      )

      expect(uri).toBe('http://localhost:8010/signed-out')
    })

    test('defaults to /signed-out when path is blank', () => {
      const uri = resolvePostLogoutAbsoluteUri(
        createRequest({ headers: { host: 'localhost:8010' } }),
        '   ',
        {}
      )

      expect(uri).toBe('http://localhost:8010/signed-out')
    })

    test('defaults to /signed-out when path is not provided', () => {
      const uri = resolvePostLogoutAbsoluteUri(
        createRequest({ headers: { host: 'localhost:8010' } }),
        undefined,
        {}
      )

      expect(uri).toBe('http://localhost:8010/signed-out')
    })

    test('uses forwarded host and https scheme when provided', () => {
      const uri = resolvePostLogoutAbsoluteUri(
        createRequest({
          headers: {
            'x-forwarded-proto': 'https',
            'x-forwarded-host': 'app.example.com'
          }
        }),
        '/signed-out',
        {}
      )

      expect(uri).toBe('https://app.example.com/signed-out')
    })

    test('uses https when the server protocol is https', () => {
      const uri = resolvePostLogoutAbsoluteUri(
        createRequest({
          protocol: 'https',
          headers: { host: 'localhost:8010' }
        }),
        '/signed-out',
        {}
      )

      expect(uri).toBe('https://localhost:8010/signed-out')
    })
  })
})
