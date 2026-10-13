export function padTwoDigits(value) {
  return String(value).padStart(2, '0')
}

export function formatPrintTimestamp(date) {
  const YEAR_SUFFIX_LENGTH = 2

  const day = padTwoDigits(date.getDate())
  const month = padTwoDigits(date.getMonth() + 1)
  const year = String(date.getFullYear()).slice(-YEAR_SUFFIX_LENGTH)
  const hours = padTwoDigits(date.getHours())
  const minutes = padTwoDigits(date.getMinutes())
  const seconds = padTwoDigits(date.getSeconds())

  return `${day}${month}${year}-${hours}${minutes}${seconds}`
}

export function sanitizeFilenamePart(value) {
  return String(value ?? '')
    .replace(/[/\\:*?"<>|]/g, '')
    .trim()
}

export function sanitizeOrganisationNameForFilename(value) {
  return sanitizeFilenamePart(value).replace(/\s+/g, '_')
}
