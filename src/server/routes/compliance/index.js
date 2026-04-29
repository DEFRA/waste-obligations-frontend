import Joi from 'joi'
import { createWasteOrganisationsApiService } from '#/server/services/waste-organisations-api.service.js'
import { renderValidationFailAction } from '#/server/common/helpers/validation-fail-action.js'
import { certificateController } from './certificate/controller.js'
import { statementController } from './statement/controller.js'

const paramsSchema = Joi.object({
  organisationId: Joi.string()
    .guid({ version: ['uuidv4', 'uuidv5'] })
    .messages({
      'string.guid': 'compliance.validation.organisationId.guid',
      'any.required': 'compliance.validation.organisationId.required'
    })
    .required()
})

const querySchema = Joi.object({
  year: Joi.number()
    .integer()
    .min(2000)
    .max(new Date().getFullYear())
    .messages({
      'number.base': 'compliance.validation.year.number',
      'number.integer': 'compliance.validation.year.number',
      'number.min': 'compliance.validation.year.min',
      'number.max': 'compliance.validation.year.max',
      'any.required': 'compliance.validation.year.required'
    })
    .required()
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
          path: '/compliance/{organisationId}/statement',
          options: routeOptions,
          ...statementController
        }
      ])
    }
  }
}
