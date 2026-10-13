import Joi from 'joi'

import { COMPLIANCE_MIN_YEAR } from '#/config/constants.js'

/**
 * Joi schema for a compliance year query value.
 *
 * The latest allowed year is read on every validation, not when the module is
 * loaded, so a server that stays up over 1 February does not keep the old limit.
 *
 * @param {() => number} getMaxYear
 */
export function complianceYearSchema(getMaxYear) {
  return Joi.number()
    .integer()
    .min(COMPLIANCE_MIN_YEAR)
    .custom((value, helpers) => {
      const limit = getMaxYear()

      return value > limit ? helpers.error('number.max', { limit }) : value
    })
}
