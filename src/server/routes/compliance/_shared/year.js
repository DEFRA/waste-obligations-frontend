export function getObligationYear(request) {
  const raw = request?.query?.year
  const parsed = typeof raw === 'string' ? Number.parseInt(raw, 10) : NaN

  // Default to the last completed calendar year (matches "past year" wording).
  const defaultYear = new Date().getFullYear() - 1

  if (!Number.isInteger(parsed) || parsed < 2000 || parsed > 2100) {
    return defaultYear
  }

  return parsed
}
