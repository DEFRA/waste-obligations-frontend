import { format, parseISO } from 'date-fns'

export function parseCertificateDeclarationApiText(text) {
  if (text == null || text === '') {
    return { intro: '', bullets: [] }
  }

  const firstNewline = text.indexOf('\n')
  if (firstNewline === -1) {
    return { intro: text, bullets: [] }
  }

  const intro = text.slice(0, firstNewline)
  const bullets = text
    .slice(firstNewline + 1)
    .split('*')
    .map((bullet) => bullet.trim())
    .filter(Boolean)

  return { intro, bullets }
}

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
