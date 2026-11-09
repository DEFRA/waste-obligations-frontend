import { now } from '#/server/common/helpers/clock.js'
import { getComplianceYear } from '#/server/common/helpers/compliance-year.js'
import {
  COMPLIANCE_RECORD_YEAR,
  getSelectableYears
} from '#/server/routes/_shared/obligations/selectable-years.js'

/**
 * Applies the year rules of the Packaging service to the Manage Obligations
 * page: a year with no obligations (2025 and earlier) goes to the compliance
 * page, and a year the user cannot choose (next year outside December and
 * January, or any later year) goes to the current year.
 *
 * Runs before the pre handlers that load data, so no data is requested for a
 * year the page will not show.
 *
 * @param {object} options
 * @param {string} options.paramKey  `'organisationId'` or `'schemeId'`.
 * @param {(id: string, year: number, request: object) => string} options.obligationsPath
 * @param {(id: string, year: number, request: object) => string} options.compliancePath
 */
export function buildObligationsYearRule({
  paramKey,
  obligationsPath,
  compliancePath
}) {
  return {
    method(request, h) {
      const id = request.params[paramKey]
      const { year } = request.query
      const date = now()

      if (year <= COMPLIANCE_RECORD_YEAR) {
        return h
          .redirect(compliancePath(id, COMPLIANCE_RECORD_YEAR, request))
          .takeover()
      }

      if (!getSelectableYears(date).includes(year)) {
        return h
          .redirect(obligationsPath(id, getComplianceYear(date), request))
          .takeover()
      }

      return h.continue
    }
  }
}
