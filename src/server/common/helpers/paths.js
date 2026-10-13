export function withYearQuery(path, year) {
  return year === undefined || year === null || year === ''
    ? path
    : `${path}?year=${year}`
}
