import {
  BELL_AZURE_AD_B2C_COOKIE,
  buildB2cLogoutUrl,
  getB2cAuthorityPrefix,
  bellRedirectOrigin
} from './azure-ad-b2c.js'

describe('azure-ad-b2c helpers', () => {
  test('BELL_AZURE_AD_B2C_COOKIE is bell-azure-ad-b2c', () => {
    expect(BELL_AZURE_AD_B2C_COOKIE).toBe('bell-azure-ad-b2c')
  })

  test('getB2cAuthorityPrefix builds from instance domain and user flow', () => {
    expect(
      getB2cAuthorityPrefix({
        instance: 'https://tenant.b2clogin.com',
        domain: 'tenant.onmicrosoft.com',
        userFlow: 'B2C_1A_EPR_SignUpSignIn'
      })
    ).toBe(
      'https://tenant.b2clogin.com/tenant.onmicrosoft.com/B2C_1A_EPR_SignUpSignIn'
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
})
