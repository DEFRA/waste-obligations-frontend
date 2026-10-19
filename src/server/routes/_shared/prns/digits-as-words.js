const DIGITS_AS_WORDS = [
  'Zero',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine'
]

/**
 * Spells an integer's digits, matching the packaging PRN PDF ("75" → "Seven Five").
 * Packaging uses the same English words for Welsh.
 *
 * @param {unknown} value
 * @returns {string}
 */
export function digitsAsWords(value) {
  if (!Number.isInteger(value) || value < 0) {
    return ''
  }

  const words = []
  let remaining = value

  do {
    words.unshift(DIGITS_AS_WORDS[remaining % 10])
    remaining = Math.floor(remaining / 10)
  } while (remaining > 0)

  return words.join(' ')
}
