import Joi from 'joi'

import { paths } from '#/config/paths.js'
import { cookiesController, cookiesPostController } from './controller.js'

const maxReturnUrlLength = 2000

const cookiesPayloadSchema = Joi.object({
  analytics: Joi.boolean().required(),
  async: Joi.boolean().default(false),
  returnUrl: Joi.string().allow('').max(maxReturnUrlLength).optional()
}).unknown(true)

const cookiesQuerySchema = Joi.object({
  updated: Joi.boolean().default(false)
}).unknown(true)

export const cookies = {
  plugin: {
    name: 'cookies',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: paths.cookies,
          options: {
            validate: {
              query: cookiesQuerySchema
            }
          },
          ...cookiesController
        },
        {
          method: 'POST',
          path: paths.cookies,
          options: {
            validate: {
              payload: cookiesPayloadSchema
            }
          },
          ...cookiesPostController
        }
      ])
    }
  }
}
