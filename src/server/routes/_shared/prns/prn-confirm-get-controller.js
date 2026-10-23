import { withForwardedPrefix } from '#/server/common/helpers/proxy/forwarded-prefix.js'
import { prnRouteOptions } from './prns-route-options.js'
import { isPrnStatusEditable } from './prn-status.js'

export function resolvePrnConfirmContext(request, paramKey, prnPath) {
  const id = request.params[paramKey]
  const { prnId } = request.params
  const { prn } = request.pre
  const year = request.query.year

  return { id, prnId, prn, prnHref: prnPath(id, prnId, year) }
}

/**
 * GET controller shared by the accept and reject confirmation pages.
 * Redirects back to the PRN when it can no longer be accepted or rejected.
 *
 * @param {object} options
 * @param {string} options.path
 * @param {string} options.paramKey
 * @param {Array} options.pre
 * @param {(id: string, prnId: string, year: number) => string} options.prnPath
 * @param {string} options.view
 * @param {(prn: object) => object} [options.extraModel]
 */
export function buildPrnConfirmGetController({
  path,
  paramKey,
  pre,
  prnPath,
  view,
  extraModel = () => ({})
}) {
  return {
    method: 'GET',
    path,
    options: { ...prnRouteOptions, pre },
    handler(request, h) {
      const { id, prnId, prn, prnHref } = resolvePrnConfirmContext(
        request,
        paramKey,
        prnPath
      )

      if (!isPrnStatusEditable(prn)) {
        return h.redirect(prnHref)
      }

      const backHref = withForwardedPrefix(request, prnHref)

      return h.view(view, {
        [paramKey]: id,
        prnId,
        prn,
        backLink: backHref,
        goBackHref: backHref,
        ...extraModel(prn)
      })
    }
  }
}
