import Joi from 'joi'

export const guidSchema = Joi.string().guid({ version: ['uuidv4', 'uuidv5'] })

export const mongoObjectIdSchema = Joi.string().hex().length(24)

export const nullableString = Joi.string().allow(null, '')
