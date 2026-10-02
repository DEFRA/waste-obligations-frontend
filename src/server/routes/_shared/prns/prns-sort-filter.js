import { translate } from '#/server/common/helpers/i18n/translate.js'
import { withForwardedPrefix } from '#/server/common/helpers/proxy/forwarded-prefix.js'
import {
  csoPrnsPath,
  producerPrnsPath
} from '#/server/routes/_shared/prns/prns-paths.js'

/**
 * Sort options in display order. `value` is the API sort key and `key` is the
 * `prns.list.sort.<key>` locale label. The first option is the default.
 */
export const PRN_SORT_OPTIONS = Object.freeze([
  { value: 'IssuedAtDescending', key: 'issuedAtDescending' },
  { value: 'IssuedAtAscending', key: 'issuedAtAscending' },
  { value: 'MaterialAscending', key: 'materialAscending' },
  { value: 'MaterialDescending', key: 'materialDescending' },
  { value: 'TonnageDescending', key: 'tonnageDescending' },
  { value: 'TonnageAscending', key: 'tonnageAscending' }
])

/**
 * Material filter options in display order. The empty value means "all
 * materials" and is the default; other values are API material names.
 */
export const PRN_MATERIAL_FILTER_OPTIONS = Object.freeze([
  { value: '', key: 'all' },
  { value: 'Aluminium', key: 'aluminium' },
  { value: 'Glass', key: 'glassOther' },
  { value: 'GlassRemelt', key: 'glassRemelt' },
  { value: 'Paper', key: 'paper' },
  { value: 'Plastic', key: 'plastic' },
  { value: 'Steel', key: 'steel' },
  { value: 'Wood', key: 'wood' }
])

function buildOptions({ options, selected, locale, labelPrefix }) {
  const selectedValue = options.some((option) => option.value === selected)
    ? selected
    : options[0].value

  return options.map(({ value, key }) => ({
    value,
    text: translate(locale, `${labelPrefix}.${key}`),
    selected: value === selectedValue
  }))
}

/**
 * Build the sort/filter/clear controls for the PRNs list.
 *
 * @param {object} options
 * @param {'producer'|'cso'} options.userType
 * @param {string} options.pathId
 * @param {string} [options.locale]
 * @param {object} [options.request]
 * @param {number} [options.year]
 * @param {string} [options.sort]
 * @param {string} [options.material]
 * @param {number} [options.pageSize]
 */
export function buildPrnsSortFilter({
  userType,
  pathId,
  locale = 'en',
  request,
  year,
  sort,
  material,
  pageSize
}) {
  const buildPath = userType === 'cso' ? csoPrnsPath : producerPrnsPath

  return {
    action: withForwardedPrefix(request, buildPath(pathId)),
    clearHref: withForwardedPrefix(request, buildPath(pathId, year)),
    year,
    pageSize,
    sortOptions: buildOptions({
      options: PRN_SORT_OPTIONS,
      selected: sort,
      locale,
      labelPrefix: 'prns.list.sort'
    }),
    filterOptions: buildOptions({
      options: PRN_MATERIAL_FILTER_OPTIONS,
      selected: material,
      locale,
      labelPrefix: 'prns.list.filter'
    })
  }
}
