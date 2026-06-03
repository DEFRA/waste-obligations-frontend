import { EPR_PACKAGING_SERVICE_NAME } from '#/server/auth/constants.js'

export function isEligibleForObligationsLogin(userOrganisations) {
  const user = userOrganisations?.user

  return user?.service === EPR_PACKAGING_SERVICE_NAME
}
