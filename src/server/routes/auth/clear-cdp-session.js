import { BELL_AZURE_AD_B2C_COOKIE } from '#/server/auth/azure-ad-b2c.js'

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

  h.unstate(BELL_AZURE_AD_B2C_COOKIE)
}
