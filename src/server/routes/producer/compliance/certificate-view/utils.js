import { format, parseISO } from 'date-fns'

export function formatSubmissionDate(value) {
  if (value == null || value === '') {
    return ''
  }

  const date = typeof value === 'string' ? parseISO(value) : value
  return format(date, 'd MMMM yyyy')
}

export function formatWholeTonnes(value) {
  return new Intl.NumberFormat('en-GB', {
    maximumFractionDigits: 0
  }).format(Number(value ?? 0))
}

/** Like formatWholeTonnes, but a missing value stays null so the table can show a dash. */
export function formatWholeTonnesOrNull(value) {
  return value == null ? null : formatWholeTonnes(value)
}
