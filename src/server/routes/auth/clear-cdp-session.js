import { getBellAzureAdB2cCookieName } from '#/server/auth/azure-ad-b2c.js'

/**
 * Clears the local CDP session cookies without triggering Azure AD B2C logout.
 *
 * @param {import('@hapi/hapi').Request} request
 * @param {import('@hapi/hapi').ResponseToolkit} h
 */
export function clearCdpSession(request, h) {
  if (request.yar) {
    request.yar.reset()
  }

  h.unstate(getBellAzureAdB2cCookieName())
}
