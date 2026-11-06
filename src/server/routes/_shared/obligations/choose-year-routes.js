import { now } from '#/server/common/helpers/clock.js'
import { getLocale } from '#/server/common/helpers/i18n/get-locale.js'
import { translate } from '#/server/common/helpers/i18n/translate.js'
import { renderValidationFailAction } from '#/server/common/helpers/validation-fail-action.js'
import {
  CSOC_UNAVAILABLE_PAST_YEAR,
  getSelectableYears
} from './selectable-years.js'

const CHOOSE_YEAR_VIEW = '_shared/obligations/views/choose-year'
const YEAR_FIELD_ID = 'obligationYear'

function renderPage(h, years, formErrors = null) {
  return h.view(CHOOSE_YEAR_VIEW, {
    yearItems: years.map((year, index) => ({
      value: year,
      text: String(year),
      id: index === 0 ? YEAR_FIELD_ID : `${YEAR_FIELD_ID}-${year}`
    })),
    fieldId: YEAR_FIELD_ID,
    formErrors
  })
}

function buildYearRequiredErrors(request) {
  const message = translate(
    getLocale(request),
    'obligations.chooseYear.errors.selectYear'
  )

  return {
    summary: [{ text: message, href: `#${YEAR_FIELD_ID}` }],
    message
  }
}

/**
 * Builds the GET + POST routes for the "Choose a year" page: the user picks the
 * year of recycling obligations to manage, and is sent to that year's
 * obligations page (or to the compliance page for a year with no obligations).
 *
 * @param {object} options
 * @param {string} options.path      Hapi route path for the page.
 * @param {string} options.paramKey  `'organisationId'` or `'schemeId'`.
 * @param {object} options.paramsSchema Joi schema for the route params.
 * @param {Array}  options.pre       Route `pre` handlers.
 * @param {(id: string, year?: number) => string} options.obligationsPath
 * @param {(id: string, year: number) => string} options.compliancePath
 * @returns {[object, object]} `[getController, postController]`
 */
export function buildObligationsChooseYearRoutes({
  path,
  paramKey,
  paramsSchema,
  pre,
  obligationsPath,
  compliancePath
}) {
  const options = {
    validate: { params: paramsSchema, failAction: renderValidationFailAction },
    pre
  }

  const getController = {
    method: 'GET',
    path,
    options,
    handler(_request, h) {
      return renderPage(h, getSelectableYears(now()))
    }
  }

  const postController = {
    method: 'POST',
    path,
    options,
    handler(request, h) {
      const years = getSelectableYears(now())
      const submitted = String(request.payload?.[YEAR_FIELD_ID] ?? '')
      const year = /^\d{4}$/.test(submitted) ? Number(submitted) : Number.NaN

      if (!years.includes(year)) {
        return renderPage(h, years, buildYearRequiredErrors(request))
      }

      const id = request.params[paramKey]
      const target =
        year === CSOC_UNAVAILABLE_PAST_YEAR
          ? compliancePath(id, year)
          : obligationsPath(id, year)

      return h.redirect(target)
    }
  }

  return [getController, postController]
}
