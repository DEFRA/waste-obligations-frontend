import { buildNavigation } from './build-navigation.js'

function mockRequest(options = {}) {
  const yarStore = new Map()

  return {
    path: '/',
    query: {},
    yar: {
      get(key) {
        return yarStore.get(key)
      },
      set(key, value) {
        yarStore.set(key, value)
      }
    },
    ...options
  }
}

describe('#buildNavigation', () => {
  test('returns sign-in link when user is not authenticated', () => {
    expect(buildNavigation(mockRequest({ path: '/signed-out' }))).toEqual([
      {
        text: 'Sign in',
        href: '/signin-oidc'
      }
    ])
  })

  test('returns Welsh sign-in link when user is not authenticated', () => {
    expect(
      buildNavigation(
        mockRequest({ path: '/signed-out', query: { lang: 'cy' } })
      )
    ).toEqual([
      {
        text: 'Mewngofnodi',
        href: '/signin-oidc?lang=cy'
      }
    ])
  })

  test('prefixes local navigation links for a reverse proxy', () => {
    const request = mockRequest({
      path: '/signed-out',
      headers: { 'x-forwarded-prefix': '/manage-recycling-obligations' }
    })

    expect(buildNavigation(request)).toEqual([
      {
        text: 'Sign in',
        href: '/manage-recycling-obligations/signin-oidc'
      }
    ])

    request.yar.set('credentials', { profile: { id: 'user-1' } })

    expect(buildNavigation(request).at(-1)).toEqual({
      text: 'Sign out',
      href: '/manage-recycling-obligations/sign-out'
    })
  })

  test('returns Home, Manage account, and Sign out links when authenticated', () => {
    const request = mockRequest({
      path: '/producer/org/compliance/certificate'
    })
    request.yar.set('credentials', { profile: { id: 'user-1' } })

    expect(buildNavigation(request)).toEqual([
      {
        text: 'Home',
        href: 'https://localhost:7084/report-data'
      },
      {
        text: 'Manage account',
        href: 'https://localhost:7084/manage-account'
      },
      {
        text: 'Sign out',
        href: '/sign-out'
      }
    ])
  })

  test('appends Welsh lang query to sign-out when authenticated', () => {
    const request = mockRequest({
      path: '/cookies',
      query: { lang: 'cy' }
    })
    request.yar.set('credentials', { profile: { id: 'user-1' } })

    const navigation = buildNavigation(request)

    expect(navigation.at(-1)).toEqual({
      text: 'Allgofnodi',
      href: '/sign-out?lang=cy'
    })
  })

  test('returns sign-in link when session is unavailable', () => {
    const request = mockRequest({ path: '/signed-out' })
    request.yar.get = () => {
      throw new Error('Session unavailable')
    }

    expect(buildNavigation(request)).toEqual([
      {
        text: 'Sign in',
        href: '/signin-oidc'
      }
    ])
  })
})
