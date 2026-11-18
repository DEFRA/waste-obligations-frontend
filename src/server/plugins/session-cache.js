import yar from '@hapi/yar'

import { config } from '#/config/config.js'

const sessionConfig = config.get('session')

// Shared session: every frontend behind the reverse proxy uses this cookie,
// so it is scoped to the whole host, not to this frontend's path prefix.
const sharedSessionCookie =
  config.get('sharedAuth.mode') === 'session'
    ? { path: '/', contextualize: () => {} }
    : {}

/**
 * Set options.maxCookieSize to 0 to always use server-side storage
 */
export const sessionCache = {
  plugin: yar,
  options: {
    // Browser cookie name.
    name: sessionConfig.cookie.name,
    cache: {
      // Server-side session-store name.
      cache: sessionConfig.cache.name,
      expiresIn: sessionConfig.cache.ttl
    },
    storeBlank: false,
    errorOnCacheNotReady: true,
    cookieOptions: {
      password: sessionConfig.cookie.password,
      ttl: sessionConfig.cookie.ttl,
      isSecure: config.get('session.cookie.secure'),
      clearInvalid: true,
      ...sharedSessionCookie
    }
  }
}
