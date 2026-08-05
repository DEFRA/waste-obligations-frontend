export async function refreshSessionUser(request) {
  const sessionUser = request.yar.get('user')

  if (!sessionUser?.id) {
    return sessionUser
  }

  // Session data is a sign-in snapshot. Account Service is authoritative for
  // current organisation membership and role on protected routes.
  const response =
    await request.server.app.backendAccountApi.getUserOrganisations(
      sessionUser.id
    )

  if (!response?.user) {
    return null
  }

  const user = {
    ...sessionUser,
    ...response.user,
    organisations: response.user.organisations ?? []
  }
  request.yar.set('user', user)

  return user
}
