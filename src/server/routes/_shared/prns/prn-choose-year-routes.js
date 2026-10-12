import { withForwardedPrefix } from '#/server/common/helpers/proxy/forwarded-prefix.js'
import { getLocale } from '#/server/common/helpers/i18n/get-locale.js'
import { translate } from '#/server/common/helpers/i18n/translate.js'
import { prnRouteOptions } from './prns-route-options.js'
import { isPrnStatusEditable } from './prn-status.js'
import { resolveAvailableAcceptanceYears } from './available-acceptance-years.js'

const CHOOSE_YEAR_VIEW = '_shared/prns/views/prn-choose-year'

export const ACCEPT_YEAR_FIELD_ID = 'acceptYear'

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

  function resolveContext(request) {
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

  function renderPage(request, h, context, { formErrors = null } = {}) {
    const { id, prnId, prn, availableYears, prnHref } = context
    const backHref = withForwardedPrefix(request, prnHref)

    return h.view(CHOOSE_YEAR_VIEW, {
      [paramKey]: id,
      prnId,
      prn,
      availableYears,
      formErrors,
      backLink: backHref
    })
  }

  const getController = {
    method: 'GET',
    path,
    options: routeOptions,
    handler(request, h) {
      const context = resolveContext(request)
      const { id, prnId, prn, year, prnHref, availableYears } = context

      if (!isPrnStatusEditable(prn)) {
        return h.redirect(prnHref)
      }

      // Nothing to choose: go straight to the confirmation page.
      if (availableYears.length < 2) {
        return h.redirect(confirmAcceptPath(id, prnId, year))
      }

      return renderPage(request, h, context)
    }
  }

  const postController = {
    method: 'POST',
    path,
    options: routeOptions,
    handler(request, h) {
      const context = resolveContext(request)
      const { id, prnId, prn, year, prnHref, availableYears } = context

      if (!isPrnStatusEditable(prn)) {
        return h.redirect(prnHref)
      }

      if (availableYears.length < 2) {
        return h.redirect(confirmAcceptPath(id, prnId, year))
      }

      const acceptYear = Number(request.payload?.[ACCEPT_YEAR_FIELD_ID])

      if (!availableYears.includes(acceptYear)) {
        const message = translate(
          getLocale(request),
          'prns.chooseYear.errors.selectYear'
        )

        return renderPage(request, h, context, {
          formErrors: {
            summary: [{ text: message, href: `#${ACCEPT_YEAR_FIELD_ID}` }],
            message
          }
        })
      }

      return h.redirect(confirmAcceptPath(id, prnId, year, acceptYear))
    }
  }

  return [getController, postController]
}
