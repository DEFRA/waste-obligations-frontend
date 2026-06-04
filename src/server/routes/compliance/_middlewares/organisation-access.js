import Boom from '@hapi/boom'

export function userCanAccessOrganisation(user, organisationId) {
  const organisations = user?.organisations ?? []
  if (organisations.length === 0) {
    return false
  }

  const targetId = String(organisationId).toLowerCase()

  return organisations.some(
    (organisation) =>
      organisation?.id && String(organisation.id).toLowerCase() === targetId
  )
}

export const organisationAccess = {
  assign: 'organisationAccess',
  method: (request) => {
    const user = request.yar.get('user')
    const { organisationId } = request.params

    if (!userCanAccessOrganisation(user, organisationId)) {
      request.logger.warn(
        { userId: user?.id, organisationId },
        'User attempted to access an organisation they are not enrolled in'
      )
      throw Boom.forbidden()
    }

    return true
  }
}
