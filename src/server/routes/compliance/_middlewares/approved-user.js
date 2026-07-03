import Boom from '@hapi/boom'

import { isApprovedOrDelegatedUser } from '../_shared/user-permissions.js'

export const approvedUser = {
  assign: 'approvedUser',
  method: (request) => {
    const user = request.yar.get('user')

    if (!isApprovedOrDelegatedUser(user)) {
      request.logger.warn(
        `User attempted to access restricted compliance page without approved/delegated role: userId=${user?.id}, serviceRole=${user?.serviceRole}`
      )
      throw Boom.notFound()
    }

    return true
  }
}
