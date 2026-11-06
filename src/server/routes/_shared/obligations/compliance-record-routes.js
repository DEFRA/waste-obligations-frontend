import { getLocale } from '#/server/common/helpers/i18n/get-locale.js'
import { renderValidationFailAction } from '#/server/common/helpers/validation-fail-action.js'
import { getRegulatorDetails } from '#/server/routes/_shared/compliance/regulator.js'
import { CSOC_UNAVAILABLE_PAST_YEAR } from './selectable-years.js'

const WALES = 'GB-WLS'
const COMPLIANCE_RECORD_VIEW = '_shared/obligations/views/compliance-record'

/**
 * Builds the GET route for the compliance record page: the page a user sees
 * for 2025 and earlier, where there are no obligations to manage and the
 * certificate or statement of compliance was processed outside the service.
 *
 * @param {object} options
 * @param {string} options.path          Hapi route path for the page.
 * @param {object} options.paramsSchema  Joi schema for the route params.
 * @param {Array}  options.pre           Route `pre` handlers; must assign `organisation`.
 * @param {boolean} options.isProducer   Producer (certificate) or scheme (statement).
 * @returns {object} The route.
 */
export function buildComplianceRecordRoute({
  path,
  paramsSchema,
  pre,
  isProducer
}) {
  return {
    method: 'GET',
    path,
    options: {
      validate: {
        params: paramsSchema,
        failAction: renderValidationFailAction
      },
      pre
    },
    handler(request, h) {
      const businessCountry = request.pre.organisation?.businessCountry
      const regulator = getRegulatorDetails(businessCountry, getLocale(request))

      return h.view(COMPLIANCE_RECORD_VIEW, {
        year: CSOC_UNAVAILABLE_PAST_YEAR,
        isProducer,
        regulatorName: regulator.name,
        isWales: businessCountry === WALES,
        regulatorEmail: regulator.email
      })
    }
  }
}
