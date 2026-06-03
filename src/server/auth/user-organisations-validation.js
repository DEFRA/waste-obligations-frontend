import { EPR_PACKAGING_SERVICE_NAME } from '#/server/auth/account-service-constants.js'

export function isEligibleForObligationsLogin(userOrganisations) {
  return (
    userOrganisations?.user != null &&
    userOrganisations.user.service === EPR_PACKAGING_SERVICE_NAME
  )
}
