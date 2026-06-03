import Boom from '@hapi/boom'

export function getUserFromRequest(request) {
  return request.yar?.get('user') ?? null
}

export function getUserIdFromRequest(request) {
  const profile = getUserFromRequest(request)?.profile
  if (!profile) {
    return null
  }

  return profile.sub || profile.oid || null
}

export function getUserEmailFromRequest(request) {
  const profile = getUserFromRequest(request)?.profile
  if (!profile) {
    return null
  }

  return (
    profile.email || profile.emails?.[0] || profile.preferred_username || null
  )
}

export function getSubmitterFromRequest(request) {
  const id = getUserIdFromRequest(request)
  if (!id) {
    throw Boom.unauthorized('You must be signed in to continue')
  }

  const email = getUserEmailFromRequest(request)
  if (!email) {
    throw Boom.badRequest('A signed-in user email address is required')
  }

  return {
    id,
    email
  }
}

export function buildCertificateSubmitCacheKey(userId, organisationId, year) {
  return `compliance-certificate-submit:${userId}:${organisationId}:${year}`
}

export function setUserFromCredentials(request, credentials) {
  request.yar.set('user', credentials)
}

export function setAccountUserFromOrganisations(request, userOrganisations) {
  const { user } = userOrganisations

  request.yar.set('accountUser', {
    email: user.email,
    serviceRole: user.serviceRole,
    service: user.service,
    organisations: (user.organisations ?? []).map((organisation) => ({
      organisationNumber: organisation.organisationNumber
    }))
  })
}
