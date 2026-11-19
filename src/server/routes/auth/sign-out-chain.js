import { config } from '#/config/config.js'
import { paths } from '#/config/paths.js'
import { authenticationOrigin } from '#/server/auth/azure-ad-b2c.js'
import { getForwardedPrefix } from '#/server/common/helpers/proxy/forwarded-prefix.js'

/** The B2C sign-out still has to happen once every frontend has cleared its session. */
export const THEN_SIGN_OUT = 'sign-out'

/** The B2C sign-out has already happened, for example when it started in EPR Packaging. */
export const THEN_FINISH = 'finish'

const START_PARAM = 'signOutStart'
const THEN_PARAM = 'signOutThen'

function frontendPaths() {
  return (config.get('sharedAuth.signOutFrontendPaths') ?? [])
    .map((path) => String(path).trim().replace(/\/+$/, ''))
    .filter((path) => path.startsWith('/') && !path.startsWith('//'))
}

/**
 * Reads the sign-out chain from a clear-session request. The query holds only
 * a position in the configured list and one of two fixed values, never a URL,
 * so it cannot be used to redirect anywhere else.
 *
 * @param {import('@hapi/hapi').Request} request
 * @returns {{ startIndex: number, then: string } | null}
 */
export function readSignOutChain(request) {
  const raw = request.query?.[START_PARAM]
  const then = request.query?.[THEN_PARAM]
  const startIndex = Number(raw)

  if (
    typeof raw !== 'string' ||
    !/^\d+$/.test(raw) ||
    startIndex >= frontendPaths().length ||
    (then !== THEN_SIGN_OUT && then !== THEN_FINISH)
  ) {
    return null
  }

  return { startIndex, then }
}

/**
 * The next frontend behind the reverse proxy whose session must be cleared,
 * as an absolute URL on this request's validated host, or null when every
 * frontend in the list has been visited (or sign-out is not chained).
 *
 * Every frontend lists the same path prefixes in the same order. Sign-out
 * starts at one of them and visits each of the others' /clear-session once.
 *
 * @param {import('@hapi/hapi').Request} request
 * @param {{ startIndex?: number, then: string }} chain
 * @returns {string | null}
 */
export function nextSignOutHop(request, { startIndex, then }) {
  const frontends = frontendPaths()
  const ownIndex = frontends.indexOf(getForwardedPrefix(request))

  if (ownIndex === -1 || frontends.length < 2) {
    return null
  }

  const start = startIndex ?? ownIndex
  const next = (ownIndex + 1) % frontends.length

  if (next === start) {
    return null
  }

  const query = new URLSearchParams({
    [START_PARAM]: String(start),
    [THEN_PARAM]: then
  })

  return `${authenticationOrigin(request)}${frontends[next]}${paths.clearSession}?${query}`
}
