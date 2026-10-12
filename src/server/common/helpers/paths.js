export function withYearQuery(path, year) {
  return year === undefined || year === null || year === ''
    ? path
    : `${path}?year=${year}`
}

/**
 * Appends every defined, non-empty entry of `query` to `path` as query
 * params, in `query`'s own key order.
 *
 * @param {string} path
 * @param {object} [query]
 * @returns {string}
 */
export function withQuery(path, query = {}) {
  const params = new URLSearchParams()

  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value))
    }
  }

  const search = params.toString()
  return search ? `${path}?${search}` : path
}
