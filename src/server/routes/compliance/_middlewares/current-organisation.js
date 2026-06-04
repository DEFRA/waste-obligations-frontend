import Boom from '@hapi/boom'

export function findUserOrganisation(user, organisationId) {
  const organisations = user?.organisations ?? []
  if (organisations.length === 0) {
    return null
  }

  const targetId = String(organisationId).toLowerCase()

  return (
    organisations.find(
      (organisation) =>
        organisation?.id && String(organisation.id).toLowerCase() === targetId
    ) ?? null
  )
}

export function userCanAccessOrganisation(user, organisationId) {
  return findUserOrganisation(user, organisationId) != null
}

export const currentOrganisation = {
  assign: 'currentOrganisation',
  method: (request) => {
    const user = request.yar.get('user')
    const { organisationId } = request.params
    const organisation = findUserOrganisation(user, organisationId)

    if (!organisation) {
      request.logger.warn(
        { userId: user?.id, organisationId },
        'User attempted to access an organisation they are not enrolled in'
      )
      throw Boom.forbidden()
    }

    return organisation
  }
}
