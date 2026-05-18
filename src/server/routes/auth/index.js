import { paths } from '#/config/paths.js'
import { AZURE_AD_B2C_AUTH_STRATEGY } from '#/server/auth/azure-ad-b2c.js'
import {
  signinOidcController,
  signOutController,
  signedOutController
} from './controller.js'

export const auth = {
  plugin: {
    name: 'auth',
    register(server) {
      server.route([
        {
          method: ['GET', 'POST'],
          path: paths.signinOidc,
          options: {
            auth: AZURE_AD_B2C_AUTH_STRATEGY
          },
          ...signinOidcController
        },
        {
          method: 'GET',
          path: paths.signOut,
          ...signOutController
        },
        {
          method: 'GET',
          path: paths.signedOut,
          ...signedOutController
        }
      ])
    }
  }
}
