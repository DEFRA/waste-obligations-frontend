import Boom from '@hapi/boom'

import { isApprovedOrDelegatedUser } from '../shared/user-permissions.js'

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
