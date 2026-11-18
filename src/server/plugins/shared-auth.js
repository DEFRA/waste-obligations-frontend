import { config } from '#/config/config.js'
import { isPublicPath } from '#/server/auth/public-paths.js'
import {
  signSharedAuthToken,
  verifySharedAuthToken
} from '#/server/auth/shared-auth-token.js'
import { isEligibleForObligationsLogin } from '#/server/auth/user-organisations-validation.js'
import {
  getUserIdFromProfile,
  loadUserOrganisations
} from '#/server/routes/auth/sign-in-oidc.js'

const SHARED_TOKEN_PROVIDER = 'shared-auth-token'

function sharedAuthConfig() {
  return config.get('sharedAuth')
}

function isTokenMode() {
  return sharedAuthConfig()?.mode === 'token'
}

/**
 * After a sign-in on this frontend, writes the token every frontend behind the
 * reverse proxy checks. Does nothing unless the token mode is on.
 *
 * @param {import('@hapi/hapi').ResponseToolkit} h
 * @param {string} userId
 */
export function setSharedAuthCookie(h, userId) {
  if (!isTokenMode()) {
    return
  }

  const { cookieName, secret, issuer, ttl } = sharedAuthConfig()
  h.state(
    cookieName,
    signSharedAuthToken({ sub: userId }, { secret, issuer, ttl })
  )
}

/**
 * At sign-out, removes the token, so every frontend drops its session on its
 * next request.
 *
 * @param {import('@hapi/hapi').ResponseToolkit} h
 */
export function clearSharedAuthCookie(h) {
  if (!isTokenMode()) {
    return
  }

  h.unstate(sharedAuthConfig().cookieName)
}

async function restoreSessionFromToken(request, userId) {
  try {
    const userOrganisations = await loadUserOrganisations(request, userId)

    if (
      !userOrganisations?.user ||
      !isEligibleForObligationsLogin(userOrganisations)
    ) {
      request.logger.info(
        `Shared sign-in not accepted: user not eligible: userId=${userId}`
      )
      return
    }

    request.yar.set('credentials', {
      provider: SHARED_TOKEN_PROVIDER,
      profile: { sub: userId }
    })
    request.yar.set('user', userOrganisations.user)
    request.logger.info(
      `Session built from the shared sign-in: userId=${userId}`
    )
  } catch {
    request.logger.warn(
      `Shared sign-in not accepted: account service error: userId=${userId}`
    )
  }
}

/**
 * Token mode: a session here lasts only while the shared token names the same
 * user. With no session and a valid token, a session is built without sending
 * the user to Azure AD B2C. Runs before require-auth.
 */
export const sharedAuth = {
  plugin: {
    name: 'shared-auth',
    register(server) {
      if (!isTokenMode()) {
        return
      }

      const { cookieName, secret, issuer, ttl } = sharedAuthConfig()

      if (!secret) {
        server.logger.warn(
          'SHARED_AUTH_MODE is token but SHARED_AUTH_SECRET is not set: no sign-in will be shared'
        )
      }

      server.state(cookieName, {
        path: '/',
        ttl,
        encoding: 'none',
        isSecure: config.get('session.cookie.secure'),
        isHttpOnly: true,
        isSameSite: 'Lax',
        clearInvalid: false,
        ignoreErrors: true,
        // Scoped to the whole host, not to this frontend's path prefix.
        contextualize: () => {}
      })

      server.ext('onPreAuth', async (request, h) => {
        if (isPublicPath(request.path) || !request.yar) {
          return h.continue
        }

        const claims = verifySharedAuthToken(request.state?.[cookieName], {
          secret,
          issuer
        })
        const credentials = request.yar.get('credentials')

        if (credentials) {
          if (
            !claims ||
            claims.sub !== getUserIdFromProfile(credentials.profile)
          ) {
            request.logger.info(
              'Session dropped: the shared sign-in has ended or changed user'
            )
            request.yar.reset()
          }
          return h.continue
        }

        if (claims) {
          await restoreSessionFromToken(request, claims.sub)
        }

        return h.continue
      })
    }
  }
}
