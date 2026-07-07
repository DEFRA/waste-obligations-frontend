const MS_PER_MINUTE = 60_000
const MS_PER_HOUR = 60 * MS_PER_MINUTE

export function formatCookieTtl(ttlMs) {
  const hours = ttlMs / MS_PER_HOUR

  if (hours >= 1 && Number.isInteger(hours)) {
    return hours === 1 ? '1 hour' : `${hours} hours`
  }

  const minutes = Math.round(ttlMs / MS_PER_MINUTE)
  return minutes === 1 ? '1 minute' : `${minutes} minutes`
}
