import ExcelJS from 'exceljs'
import { describe, expect, test } from 'vitest'
import { findHeaderColumns, getTranslatedRowsFromWorksheet } from './import-translations.js'

describe('import translations', () => {
  test('finds hidden key columns after the translator notes section', () => {
    const worksheet = createWorksheet()

    expect(findHeaderColumns(worksheet)).toEqual({
      headerRowNumber: 4,
      columns: {
        translationKey: 1,
        welsh: 5
      }
    })
  })

  test('reads translated values from the workbook rows', () => {
    const worksheet = createWorksheet()

    expect(getTranslatedRowsFromWorksheet(worksheet)).toEqual([
      {
        translationKey: 'auth.signInFailed.heading',
        welsh: 'Methu mewngofnodi'
      },
      {
        translationKey: 'auth.signInFailed.noCredentials',
        welsh: ''
      }
    ])
  })
})

function createWorksheet () {
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet('Welsh translations')

  worksheet.columns = [
    { key: 'translationKey', hidden: true },
    { key: 'parentKey', hidden: true },
    { key: 'section', hidden: true },
    { key: 'english' },
    { key: 'welsh' },
    { key: 'figmaUrl' }
  ]

  worksheet.getCell('D1').value = 'Translator notes'
  worksheet.getCell('D2').value = 'Translations with syntax such as {{year}} should be preserved in the translated text, as it\'s a placeholder for a dynamic value'
  worksheet.getRow(4).values = [
    'Translation key',
    'Parent key',
    'Section',
    'English',
    'Welsh',
    'Figma link'
  ]
  worksheet.addRow({
    translationKey: 'auth.signInFailed.heading',
    parentKey: 'auth.signInFailed',
    section: 'auth.signInFailed',
    english: 'Sign in failed',
    welsh: 'Methu mewngofnodi',
    figmaUrl: ''
  })
  worksheet.addRow({
    translationKey: 'auth.signInFailed.noCredentials',
    parentKey: 'auth.signInFailed',
    section: 'auth.signInFailed',
    english: 'We could not sign you in. Try again.',
    welsh: '',
    figmaUrl: ''
  })

  return worksheet
}

