import { getLocale } from '#/server/common/helpers/i18n/get-locale.js'
import { withForwardedPrefix } from '#/server/common/helpers/proxy/forwarded-prefix.js'
import { renderValidationFailAction } from '#/server/common/helpers/validation-fail-action.js'
import { getRegulatorDetails } from '#/server/routes/_shared/compliance/regulator.js'
import { COMPLIANCE_RECORD_YEAR } from './selectable-years.js'

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
 * @param {(id: string) => string} options.downloadPrnsPath  The CSV download of the year's PRNs and PERNs.
 * @param {string} options.paramKey      The route param that holds the id.
 * @returns {object} The route.
 */
export function buildComplianceRecordRoute({
  path,
  paramsSchema,
  pre,
  isProducer,
  paramKey,
  downloadPrnsPath
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

      const id = request.params[paramKey]

      return h.view(COMPLIANCE_RECORD_VIEW, {
        year: COMPLIANCE_RECORD_YEAR,
        downloadPrnsHref: withForwardedPrefix(request, downloadPrnsPath(id)),
        isProducer,
        regulatorName: regulator.name,
        isWales: businessCountry === WALES,
        regulatorEmail: regulator.email
      })
    }
  }
}
