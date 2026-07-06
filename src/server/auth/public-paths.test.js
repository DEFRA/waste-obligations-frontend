import { isPublicPath } from './public-paths.js'

describe('isPublicPath', () => {
  test('allows health and auth routes', () => {
    expect(isPublicPath('/health')).toBe(true)
    expect(isPublicPath('/signin-oidc')).toBe(true)
    expect(isPublicPath('/sign-out')).toBe(true)
    expect(isPublicPath('/clear-session')).toBe(true)
    expect(isPublicPath('/signed-out')).toBe(true)
    expect(isPublicPath('/favicon.ico')).toBe(true)
  })

  test('allows static assets under /public', () => {
    expect(isPublicPath('/public/assets/main.js')).toBe(true)
  })

  test('denies application routes', () => {
    expect(isPublicPath('/')).toBe(false)
    expect(isPublicPath('/compliance/producer/org/certificate')).toBe(false)
  })
})
