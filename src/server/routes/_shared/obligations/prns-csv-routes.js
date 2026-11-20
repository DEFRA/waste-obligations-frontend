import Boom from '@hapi/boom'

import { getLocale } from '#/server/common/helpers/i18n/get-locale.js'
import { logApplicationError } from '#/server/common/helpers/logging/application-error.js'
import { withForwardedPrefix } from '#/server/common/helpers/proxy/forwarded-prefix.js'
import { renderValidationFailAction } from '#/server/common/helpers/validation-fail-action.js'
import { loadPrnsForObligationYear } from '#/server/routes/_shared/prns/load-prns-for-obligation-year.js'
import {
  OBLIGATIONS_COLUMNS,
  buildPrnsCsv
} from '#/server/routes/_shared/prns/prns-csv.js'
import { obligationsYearQuerySchema } from './schema.js'
import { COMPLIANCE_RECORD_YEAR } from './selectable-years.js'

const CSV_EMPTY_VIEW = '_shared/obligations/views/prns-csv-empty'

async function prnsCsvResponse({
  request,
  h,
  id,
  year,
  columns,
  fileName,
  backLink
}) {
  const locale = getLocale(request)
  let prns

  try {
    prns = await loadPrnsForObligationYear(
      request.server.app.wasteObligationsApi,
      id,
      year
    )
  } catch (error) {
    logApplicationError(
      request.logger,
      'warn',
      error,
      'Failed to load PRNs for the CSV download'
    )

    throw Boom.badImplementation()
  }

  if (prns.length === 0) {
    return h.view(CSV_EMPTY_VIEW, { year, backLink })
  }

  return h
    .response(buildPrnsCsv(prns, locale, columns))
    .type('text/csv')
    .header('Content-Disposition', `attachment; filename="${fileName}"`)
    .header('Cache-Control', 'no-store')
}

/**
 * Builds a GET route that downloads, as a CSV, every PRN and PERN issued to the
 * organisation or scheme for one obligation year. With none to download it
 * shows a page saying so.
 *
 * @param {object} options
 * @param {string} options.path          Hapi route path.
 * @param {'organisationId'|'schemeId'} options.paramKey
 * @param {object} options.paramsSchema  Joi schema for the route params.
 * @param {Array}  options.pre           Route `pre` handlers.
 * @param {object} [options.querySchema] Joi schema for the query, when the year comes from it.
 * @param {(request: object) => number} options.getYear
 * @param {readonly string[]} [options.columns]  The columns to write, in order.
 * @param {(year: number) => string} options.fileName
 * @param {(id: string, year: number) => string} options.backPath  Where the empty page links back to.
 * @returns {object} The route.
 */
function buildCsvRoute({
  path,
  paramKey,
  paramsSchema,
  querySchema,
  pre,
  getYear,
  columns,
  fileName,
  backPath
}) {
  return {
    method: 'GET',
    path,
    options: {
      validate: {
        params: paramsSchema,
        ...(querySchema && { query: querySchema }),
        failAction: renderValidationFailAction
      },
      pre
    },
    handler(request, h) {
      const id = request.params[paramKey]
      const year = getYear(request)

      return prnsCsvResponse({
        request,
        h,
        id,
        year,
        columns,
        fileName: fileName(year),
        backLink: withForwardedPrefix(request, backPath(id, year))
      })
    }
  }
}

/**
 * The route that downloads every PRN and PERN issued to the organisation or
 * scheme for the compliance record year (2025).
 *
 * @param {object} options
 * @param {string} options.path
 * @param {'organisationId'|'schemeId'} options.paramKey
 * @param {object} options.paramsSchema
 * @param {Array}  options.pre
 * @param {(id: string) => string} options.backPath
 * @returns {object} The route.
 */
export function buildPrnsCsvRoute({
  path,
  paramKey,
  paramsSchema,
  pre,
  backPath
}) {
  return buildCsvRoute({
    path,
    paramKey,
    paramsSchema,
    pre,
    getYear: () => COMPLIANCE_RECORD_YEAR,
    fileName: (year) => `PRNDetail_${year}.csv`,
    backPath: (id) => backPath(id)
  })
}

/**
 * The route that downloads every PRN and PERN issued to the organisation or
 * scheme for the obligation year of the Manage Obligations page (`?year=`).
 *
 * @param {object} options
 * @param {string} options.path
 * @param {'organisationId'|'schemeId'} options.paramKey
 * @param {object} options.paramsSchema
 * @param {Array}  options.pre  Route `pre` handlers, including the year rule.
 * @param {(id: string, year: number) => string} options.backPath
 * @returns {object} The route.
 */
export function buildObligationsPrnsCsvRoute({
  path,
  paramKey,
  paramsSchema,
  pre,
  backPath
}) {
  return buildCsvRoute({
    path,
    paramKey,
    paramsSchema,
    querySchema: obligationsYearQuerySchema,
    pre,
    getYear: (request) => request.query.year,
    columns: OBLIGATIONS_COLUMNS,
    fileName: (year) => `PRNDetail${year}.csv`,
    backPath
  })
}
