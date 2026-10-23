import { config } from '#/config/config.js'
import { now } from '#/server/common/helpers/clock.js'
import { getComplianceYear } from '#/server/common/helpers/compliance-year.js'
import { getLocale } from '#/server/common/helpers/i18n/get-locale.js'
import { translate } from '#/server/common/helpers/i18n/translate.js'
import { withForwardedPrefix } from '#/server/common/helpers/proxy/forwarded-prefix.js'
import {
  csoObligationsHomePath,
  producerObligationsHomePath
} from '#/server/routes/_shared/obligations/obligations-paths.js'
import { materialI18nKey } from '#/server/routes/producer/compliance/certificate-submit/obligation-presenter.js'
import { csoPrnsPath, producerPrnsPath } from './prns-paths.js'
import { prnsCheckSelectionRouteOptions } from './prns-route-options.js'
import { withQuery } from '#/server/common/helpers/paths.js'
import {
  pickListQuery,
  getAcceptedPrnsFromSession
} from './selected-prns-session.js'
import { groupPrnsByMaterial } from './view-models/group-prns-by-material.js'

const ACCEPTED_SELECTION_VIEW = '_shared/prns/views/prns-accepted-selection'

// The material's name from the obligations table component
// (compliance.components.obligationsTable.material), using the same mapping
// as the obligations pages. Keyed by the grouped material (paper and fibre are
// grouped as 'Paper'). No page base: resolve straight to the shared
// obligations table keys. Undefined for a missing or unrecognised material, so
// the tile leaves the material out rather than showing 'not provided' or a raw
// API value.
function materialLabel(locale, material) {
  const key = materialI18nKey(locale, null, material)

  return key ? translate(locale, key) : undefined
}

// The year the PRNs were accepted into, from the PRNs themselves, so the page
// shows it even when the list was opened without ?year. If they don't agree on
// one year, the list's ?year is used, then the current compliance year, so the
// obligations button always has a year to go to (MO-471 AC5).
function resolveAcceptedYear(prns, queryYear, at) {
  const years = new Set(
    prns.map((prn) => prn.acceptanceYear).filter(Number.isInteger)
  )

  if (years.size === 1) {
    return [...years][0]
  }

  return queryYear ?? getComplianceYear(at)
}

const PATHS = {
  producer: {
    list: producerPrnsPath,
    obligations: producerObligationsHomePath
  },
  cso: { list: csoPrnsPath, obligations: csoObligationsHomePath }
}

/**
 * Builds the GET route for the confirmation shown after PRNs are accepted in
 * bulk from the check-selection page.
 *
 * The accepted PRNs are read from the session once (see
 * selected-prns-session.js); with none there, e.g. on a refresh, the user is
 * sent to the PRNs list, keeping the list query the confirmation was reached
 * with.
 *
 * @param {object} options
 * @param {string} options.path
 * @param {'organisationId'|'schemeId'} options.paramKey
 * @param {'producer'|'cso'} options.userType
 * @param {Array} options.pre
 * @returns {object} the GET controller
 */
export function buildPrnsAcceptedSelectionRoute({
  path,
  paramKey,
  userType,
  pre
}) {
  const paths = PATHS[userType]

  return {
    method: 'GET',
    path,
    options: { ...prnsCheckSelectionRouteOptions, pre },
    handler(request, h) {
      const id = request.params[paramKey]
      const prns = getAcceptedPrnsFromSession(request, userType, id)

      if (prns.length === 0) {
        return h.redirect(
          withQuery(paths.list(id), pickListQuery(request.query))
        )
      }

      const year = resolveAcceptedYear(prns, request.query.year, now())
      const locale = getLocale(request)

      return h.view(ACCEPTED_SELECTION_VIEW, {
        [paramKey]: id,
        year,
        count: prns.length,
        materials: groupPrnsByMaterial(prns, locale).map((group) => ({
          material: group.material,
          label: materialLabel(locale, group.material),
          totalTonnage: group.totalTonnage
        })),
        // Without the CDP obligations page, fall back to the Azure one (an
        // absolute URL to another service, so not prefixed), passing the
        // year accepted into as ?year=YYYY so it shows the same year.
        obligationsLink: config.get('features.manageObligations')
          ? withForwardedPrefix(request, paths.obligations(id, year))
          : withQuery(
              config.get('eprPackaging.manageYourRecyclingObligationsUrl'),
              { year }
            )
      })
    }
  }
}
