import { withForwardedPrefix } from '#/server/common/helpers/proxy/forwarded-prefix.js'
import { getLocale } from '#/server/common/helpers/i18n/get-locale.js'
import { translate } from '#/server/common/helpers/i18n/translate.js'
import { prnRouteOptions } from './prns-route-options.js'
import { isPrnStatusEditable } from './prn-status.js'
import { resolveAvailableAcceptanceYears } from './available-acceptance-years.js'

const CHOOSE_YEAR_VIEW = '_shared/prns/views/prn-choose-year'

export const ACCEPT_YEAR_FIELD_ID = 'acceptYear'

function resolveContext(request, { paramKey, prnPath }) {
  const id = request.params[paramKey]
  const { prnId } = request.params
  const { prn } = request.pre
  const { year } = request.query

  return {
    id,
    prnId,
    prn,
    year,
    prnHref: prnPath(id, prnId, year),
    availableYears: resolveAvailableAcceptanceYears(prn)
  }
}

function renderPage(request, h, context, { paramKey, formErrors = null }) {
  const { id, prnId, prn, availableYears, prnHref } = context

  return h.view(CHOOSE_YEAR_VIEW, {
    [paramKey]: id,
    prnId,
    prn,
    availableYears,
    formErrors,
    backLink: withForwardedPrefix(request, prnHref)
  })
}

function buildYearRequiredErrors(request) {
  const message = translate(
    getLocale(request),
    'prns.chooseYear.errors.selectYear'
  )

  return {
    summary: [{ text: message, href: `#${ACCEPT_YEAR_FIELD_ID}` }],
    message
  }
}

/**
 * Builds the GET + POST routes for the "choose which year to accept into" page,
 * shown before the confirmation page when a December waste PRN can be accepted
 * into more than one obligation year.
 *
 * @param {object} options
 * @param {string} options.path      Hapi route path for the page.
 * @param {string} options.paramKey  `'organisationId'` or `'schemeId'`.
 * @param {Array}  options.pre       Route `pre` handlers; must assign `prn`.
 * @param {(id: string, prnId: string, year?: number) => string} options.prnPath
 * @param {(id: string, prnId: string, year?: number, acceptYear?: number) => string} options.confirmAcceptPath
 * @returns {[object, object]} `[getController, postController]`
 */
export function buildPrnChooseYearRoutes({
  path,
  paramKey,
  pre,
  prnPath,
  confirmAcceptPath
}) {
  const routeOptions = { ...prnRouteOptions, pre }

  // Redirects when the page does not apply (PRN no longer awaiting acceptance,
  // or no year choice: go straight to the confirmation page).
  function redirectIfNotApplicable(h, context) {
    const { id, prnId, prn, year, prnHref, availableYears } = context

    if (!isPrnStatusEditable(prn)) {
      return h.redirect(prnHref)
    }

    if (availableYears.length < 2) {
      return h.redirect(confirmAcceptPath(id, prnId, year))
    }

    return null
  }

  const getController = {
    method: 'GET',
    path,
    options: routeOptions,
    handler(request, h) {
      const context = resolveContext(request, { paramKey, prnPath })

      return (
        redirectIfNotApplicable(h, context) ??
        renderPage(request, h, context, { paramKey })
      )
    }
  }

  const postController = {
    method: 'POST',
    path,
    options: routeOptions,
    handler(request, h) {
      const context = resolveContext(request, { paramKey, prnPath })
      const redirect = redirectIfNotApplicable(h, context)

      if (redirect) {
        return redirect
      }

      const { id, prnId, year, availableYears } = context
      const acceptYear = Number(request.payload?.[ACCEPT_YEAR_FIELD_ID])

      if (!availableYears.includes(acceptYear)) {
        return renderPage(request, h, context, {
          paramKey,
          formErrors: buildYearRequiredErrors(request)
        })
      }

      return h.redirect(confirmAcceptPath(id, prnId, year, acceptYear))
    }
  }

  return [getController, postController]
}
