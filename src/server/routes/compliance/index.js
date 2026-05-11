import Joi from 'joi'
import Boom from '@hapi/boom'
import { createWasteOrganisationsApiService } from '#/server/services/waste-organisations-api.service.js'
import { renderValidationFailAction } from '#/server/common/helpers/validation-fail-action.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import { certificateController } from './certificate/controller.js'
import { certificateSuccessController } from './certificate-success/controller.js'
import {
  certificateSubmitController,
  certificateSubmitPostController
} from './certificate-submit/controller.js'
import { statementController } from './statement/controller.js'
import { COMPLIANCE_MIN_YEAR } from '#/config/constants.js'

const MAX_YEAR = new Date().getFullYear()

const paramsSchema = Joi.object({
  organisationId: Joi.string()
    .guid({ version: ['uuidv4', 'uuidv5'] })
    .required()
})

const querySchema = Joi.object({
  year: Joi.number().integer().min(COMPLIANCE_MIN_YEAR).max(MAX_YEAR).required()
}).unknown(true)

const certificateSuccessQuerySchema = Joi.object({
  year: Joi.number()
    .integer()
    .min(COMPLIANCE_MIN_YEAR)
    .max(MAX_YEAR)
    .required(),
  status: Joi.string().valid('met', 'not_met').required(),
  email: Joi.string().email().optional()
}).unknown(true)

const routeOptions = {
  validate: {
    params: paramsSchema,
    query: querySchema,
    failAction: renderValidationFailAction
  },
  pre: [
    {
      assign: 'organisation',
      method: async (request) => {
        const { organisationId } = request.params
        const { traceId } = request.app

        try {
          return await createWasteOrganisationsApiService().getOrganisation(
            organisationId,
            traceId
          )
        } catch (error) {
          if (error?.status === statusCodes.notFound) {
            throw Boom.notFound()
          }

          request.logger.warn(
            { err: error, organisationId },
            'Failed to load organisation details'
          )
        }

        return null
      }
    }
  ]
}

export const compliance = {
  plugin: {
    name: 'compliance',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/compliance/{organisationId}/certificate',
          options: routeOptions,
          ...certificateController
        },
        {
          method: 'GET',
          path: '/compliance/{organisationId}/certificate/submit',
          options: routeOptions,
          ...certificateSubmitController
        },
        {
          method: 'POST',
          path: '/compliance/{organisationId}/certificate/submit',
          options: {
            ...routeOptions,
            validate: {
              ...routeOptions.validate,
              payload: Joi.object({
                fullName: Joi.string().trim().min(1).required()
              }),
              failAction: renderValidationFailAction
            }
          },
          ...certificateSubmitPostController
        },
        {
          method: 'GET',
          path: '/compliance/{organisationId}/certificate/success',
          options: {
            ...routeOptions,
            validate: {
              ...routeOptions.validate,
              query: certificateSuccessQuerySchema
            }
          },
          ...certificateSuccessController
        },
        {
          method: 'GET',
          path: '/compliance/{organisationId}/statement',
          options: routeOptions,
          ...statementController
        }
      ])
    }
  }
}
