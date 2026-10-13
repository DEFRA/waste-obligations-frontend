const minimumTranslationRowHeight = 48
const translationRowLineHeight = 18
const translationRowVerticalPadding = 10
const wrappedTextWidthFactor = 0.75

export function calculateTranslationRowHeight(cells) {
  const lineCount = Math.max(
    1,
    ...cells.map(({ value, width }) =>
      calculateWrappedLineCount(getCellText(value), width)
    )
  )

  return Math.max(
    minimumTranslationRowHeight,
    lineCount * translationRowLineHeight + translationRowVerticalPadding
  )
}

function calculateWrappedLineCount(value, width) {
  if (!value) {
    return 1
  }

  const effectiveWidth = Math.max(1, Math.floor(width * wrappedTextWidthFactor))

  return value
    .split(/\r\n|\r|\n/)
    .reduce(
      (lineCount, line) =>
        lineCount + Math.max(1, Math.ceil(line.length / effectiveWidth)),
      0
    )
}

function getCellText(value) {
  if (value === null || value === undefined) {
    return ''
  }

  if (typeof value === 'object') {
    if ('text' in value) {
      return value.text
    }

    if ('richText' in value) {
      return value.richText.map(({ text }) => text).join('')
    }
  }

  return String(value)
}
