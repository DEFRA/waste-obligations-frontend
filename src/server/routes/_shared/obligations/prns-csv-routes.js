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
 * Builds the GET route that downloads, as a CSV, every PRN and PERN issued to
 * the organisation or scheme for the compliance record year (2025). With none
 * to download it shows a page saying so.
 *
 * @param {object} options
 * @param {string} options.path          Hapi route path.
 * @param {'organisationId'|'schemeId'} options.paramKey
 * @param {object} options.paramsSchema  Joi schema for the route params.
 * @param {Array}  options.pre           Route `pre` handlers.
 * @param {(id: string) => string} options.backPath  Where the empty page links back to.
 * @returns {object} The route.
 */
export function buildPrnsCsvRoute({
  path,
  paramKey,
  paramsSchema,
  pre,
  backPath
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
      const id = request.params[paramKey]

      return prnsCsvResponse({
        request,
        h,
        id,
        year: COMPLIANCE_RECORD_YEAR,
        fileName: `PRNDetail_${COMPLIANCE_RECORD_YEAR}.csv`,
        backLink: withForwardedPrefix(request, backPath(id))
      })
    }
  }
}

/**
 * Builds the GET route that downloads, as a CSV, every PRN and PERN issued to
 * the organisation or scheme for the obligation year of the Manage Obligations
 * page (`?year=`). With none to download it shows a page saying so.
 *
 * @param {object} options
 * @param {string} options.path          Hapi route path.
 * @param {'organisationId'|'schemeId'} options.paramKey
 * @param {object} options.paramsSchema  Joi schema for the route params.
 * @param {Array}  options.pre           Route `pre` handlers, including the year rule.
 * @param {(id: string, year: number) => string} options.backPath  Where the empty page links back to.
 * @returns {object} The route.
 */
export function buildObligationsPrnsCsvRoute({
  path,
  paramKey,
  paramsSchema,
  pre,
  backPath
}) {
  return {
    method: 'GET',
    path,
    options: {
      validate: {
        params: paramsSchema,
        query: obligationsYearQuerySchema,
        failAction: renderValidationFailAction
      },
      pre
    },
    handler(request, h) {
      const id = request.params[paramKey]
      const year = request.query.year

      return prnsCsvResponse({
        request,
        h,
        id,
        year,
        columns: OBLIGATIONS_COLUMNS,
        fileName: `PRNDetail${year}.csv`,
        backLink: withForwardedPrefix(request, backPath(id, year))
      })
    }
  }
}
