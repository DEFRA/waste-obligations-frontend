import { createPrnsMiddleware } from '#/server/routes/_shared/prns/create-prns-middleware.js'

export const prns = createPrnsMiddleware('organisationId')
