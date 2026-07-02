import { describe, expect, test } from 'vitest'
import { calculateTranslationRowHeight } from './worksheet-formatting.js'

describe('worksheet formatting', () => {
  test('uses the minimum translation row height for short content', () => {
    expect(
      calculateTranslationRowHeight([{ value: 'Short translation', width: 70 }])
    ).toBe(48)
  })

  test('increases translation row height for wrapped content', () => {
    const height = calculateTranslationRowHeight([
      {
        value:
          'This is a much longer English translation value that should wrap across several lines in the generated workbook so translators can read all of it without resizing the row.',
        width: 40
      }
    ])

    expect(height).toBeGreaterThan(48)
  })

  test('counts explicit line breaks when calculating row height', () => {
    expect(
      calculateTranslationRowHeight([
        { value: 'First line\nSecond line\nThird line\nFourth line', width: 70 }
      ])
    ).toBeGreaterThan(48)
  })

  test('uses hyperlink text when calculating row height', () => {
    const height = calculateTranslationRowHeight([
      {
        value: {
          text: 'https://www.figma.com/design/a-very-long-page-link-that-wraps-inside-the-figma-column',
          hyperlink: 'https://www.figma.com/design/example'
        },
        width: 30
      }
    ])

    expect(height).toBeGreaterThan(48)
  })
})
