export async function createComplianceDeclarationAndClearCache(
  request,
  organisationId,
  cacheKey,
  payload
) {
  const created =
    await request.server.app.wasteObligationsApi.createComplianceDeclaration(
      organisationId,
      payload
    )
  await request.server.app.redisClient.del(cacheKey)
  return created
}
