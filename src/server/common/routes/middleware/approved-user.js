import Boom from '@hapi/boom'

import {
  isApprovedOrDelegatedUser,
  isBasicUser
} from '../shared/user-permissions.js'

function restrictedPageKind(path) {
  if (path?.startsWith('/producer/')) {
    return 'producer'
  }

  if (path?.startsWith('/cso/')) {
    return 'cso'
  }

  return 'compliance'
}

export const approvedUser = {
  assign: 'approvedUser',
  method: (request) => {
    const user = request.yar.get('user')

    if (!isApprovedOrDelegatedUser(user)) {
      request.logger.warn(
        `User attempted to access restricted ${restrictedPageKind(request.path)} page without approved/delegated role: userId=${user?.id}, serviceRole=${user?.serviceRole}`
      )
      throw Boom.forbidden()
    }

    return true
  }
}

// Lets approved, delegated and basic users through. Only a user with no
// recognised service role is refused.
export const allUsers = {
  assign: 'approvedUser',
  method: (request) => {
    const user = request.yar.get('user')

    if (!isApprovedOrDelegatedUser(user) && !isBasicUser(user)) {
      request.logger.warn(
        `User attempted to access ${restrictedPageKind(request.path)} page without a recognised service role: userId=${user?.id}, serviceRole=${user?.serviceRole}`
      )
      throw Boom.forbidden()
    }

    return true
  }
}
