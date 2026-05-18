import { paths } from '#/config/paths.js'
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
            auth: 'azure-ad-b2c'
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
