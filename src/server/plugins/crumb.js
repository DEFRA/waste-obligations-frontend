import hapiCrumb from '@hapi/crumb'

import { config } from '#/config/config.js'

export const CSRF_COOKIE_NAME = 'wasteObligationsCsrf'

export const crumb = {
  plugin: hapiCrumb,
  options: {
    key: CSRF_COOKIE_NAME,
    restful: false,
    cookieOptions: {
      isSecure: config.get('session.cookie.secure'),
      isHttpOnly: true,
      isSameSite: 'Strict'
    }
  }
}
