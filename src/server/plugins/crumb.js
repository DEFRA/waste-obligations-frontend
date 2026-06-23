import hapiCrumb from '@hapi/crumb'

import { config } from '#/config/config.js'

export const crumb = {
  plugin: hapiCrumb,
  options: {
    key: 'crumb',
    restful: false,
    cookieOptions: {
      isSecure: config.get('session.cookie.secure'),
      isHttpOnly: true,
      isSameSite: 'Strict'
    }
  }
}
