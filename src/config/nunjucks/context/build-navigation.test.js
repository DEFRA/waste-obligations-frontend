import { config } from '#/config/config.js'
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

describe('#buildNavigation with another frontend behind the proxy', () => {
  beforeEach(() => {
    config.set('sharedAuth.otherFrontend.path', '/second-frontend')
    config.set('sharedAuth.otherFrontend.name', 'the second frontend')
  })

  afterEach(() => {
    config.set('sharedAuth.otherFrontend.path', '')
    config.set('sharedAuth.otherFrontend.name', 'the other frontend')
  })

  test('links to the same page on the other frontend, keeping the query', () => {
    const request = mockRequest({
      path: '/producer/org-1/prns',
      query: { lang: 'cy', page: '2' },
      headers: { 'x-forwarded-prefix': '/manage-recycling-obligations' }
    })
    request.yar.set('credentials', { profile: { id: 'user-1' } })

    expect(buildNavigation(request).at(-2)).toEqual({
      text: 'Open in the second frontend',
      href: '/second-frontend/producer/org-1/prns?lang=cy&page=2'
    })
  })

  test('shows the link before sign-in too', () => {
    const navigation = buildNavigation(mockRequest({ path: '/producer' }))

    expect(navigation.map((item) => item.href)).toEqual([
      '/second-frontend/producer',
      '/signin-oidc'
    ])
  })

  test('drops a trailing slash from the configured path', () => {
    config.set('sharedAuth.otherFrontend.path', '/second-frontend/')

    expect(buildNavigation(mockRequest({ path: '/cookies' }))[0].href).toBe(
      '/second-frontend/cookies'
    )
  })
})
