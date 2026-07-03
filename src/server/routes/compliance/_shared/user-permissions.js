import {
  EPR_PACKAGING_APPROVED_PERSON_SERVICE_ROLE,
  EPR_PACKAGING_DELEGATED_PERSON_SERVICE_ROLE
} from '#/server/auth/constants.js'

export function isApprovedOrDelegatedUser(user) {
  const serviceRole = user?.serviceRole

  return (
    serviceRole === EPR_PACKAGING_APPROVED_PERSON_SERVICE_ROLE ||
    serviceRole === EPR_PACKAGING_DELEGATED_PERSON_SERVICE_ROLE
  )
}
