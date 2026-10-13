import ExcelJS from 'exceljs'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, test } from 'vitest'
import {
  extractPlaceholders,
  findHeaderColumns,
  getTranslatedRowsFromInputPath,
  getTranslatedRowsFromWorksheet,
  validateTranslatedRowPlaceholders
} from './import-translations.js'

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

  test('reads translated values from all workbooks in a directory', async () => {
    const directory = await fs.mkdtemp(
      path.join(os.tmpdir(), 'translation-import-')
    )
    const firstWorkbookPath = path.join(directory, 'first.xlsx')
    const secondWorkbookPath = path.join(directory, 'second.xlsx')

    await writeWorkbook(firstWorkbookPath, [
      {
        translationKey: 'auth.signInFailed.heading',
        welsh: 'Methu mewngofnodi'
      }
    ])
    await writeWorkbook(secondWorkbookPath, [
      {
        translationKey: 'auth.signedOut.heading',
        welsh: 'Allgofnodwyd'
      }
    ])

    await expect(getTranslatedRowsFromInputPath(directory)).resolves.toEqual([
      {
        translationKey: 'auth.signInFailed.heading',
        welsh: 'Methu mewngofnodi'
      },
      {
        translationKey: 'auth.signedOut.heading',
        welsh: 'Allgofnodwyd'
      }
    ])

    await fs.rm(directory, { recursive: true })
  })

  test('reads translated values from an xlsx subdirectory when given an export root directory', async () => {
    const directory = await fs.mkdtemp(
      path.join(os.tmpdir(), 'translation-import-')
    )
    const workbookDirectory = path.join(directory, 'xlsx')

    await fs.mkdir(workbookDirectory)
    await writeWorkbook(path.join(workbookDirectory, 'first.xlsx'), [
      {
        translationKey: 'auth.signInFailed.heading',
        welsh: 'Methu mewngofnodi'
      }
    ])

    await expect(getTranslatedRowsFromInputPath(directory)).resolves.toEqual([
      {
        translationKey: 'auth.signInFailed.heading',
        welsh: 'Methu mewngofnodi'
      }
    ])

    await fs.rm(directory, { recursive: true })
  })

  test('fails when workbooks contain conflicting translated values for the same key', async () => {
    const directory = await fs.mkdtemp(
      path.join(os.tmpdir(), 'translation-import-')
    )

    await writeWorkbook(path.join(directory, 'first.xlsx'), [
      {
        translationKey: 'common.nav.home',
        welsh: 'Hafan'
      }
    ])
    await writeWorkbook(path.join(directory, 'second.xlsx'), [
      {
        translationKey: 'common.nav.home',
        welsh: 'Cartref'
      }
    ])

    await expect(getTranslatedRowsFromInputPath(directory)).rejects.toThrow(
      'Conflicting Welsh values found for translation key "common.nav.home"'
    )

    await fs.rm(directory, { recursive: true })
  })

  test('extracts placeholders after decoding HTML entities', () => {
    expect(
      extractPlaceholders(
        'About {{year}}, &#123;&#123;regulatorName&#125;&#125; and &lcub;&lcub;userEmail&rcub;&rcub;'
      )
    ).toEqual(['year', 'regulatorName', 'userEmail'])
  })

  test('validates Welsh translations include placeholders from the English source', () => {
    expect(() =>
      validateTranslatedRowPlaceholders({
        englishTranslations: {
          compliance: {
            heading: 'Submit your {{year}} certificate to {{regulatorName}}'
          }
        },
        translatedRows: [
          {
            translationKey: 'compliance.heading',
            welsh: 'Cyflwyno eich tystysgrif {{year}}'
          }
        ]
      })
    ).toThrow(
      'Translation key "compliance.heading" is missing placeholder {{regulatorName}}'
    )
  })

  test('accepts HTML encoded placeholders in imported Welsh values', () => {
    expect(
      validateTranslatedRowPlaceholders({
        englishTranslations: {
          compliance: {
            heading: 'Submit your {{year}} certificate'
          }
        },
        translatedRows: [
          {
            translationKey: 'compliance.heading',
            welsh: 'Cyflwyno eich tystysgrif &#123;&#123;year&#125;&#125;'
          }
        ]
      })
    ).toEqual([
      {
        translationKey: 'compliance.heading',
        welsh: 'Cyflwyno eich tystysgrif &#123;&#123;year&#125;&#125;'
      }
    ])
  })

  test('does not validate blank Welsh cells because they preserve existing values', () => {
    expect(
      validateTranslatedRowPlaceholders({
        englishTranslations: {
          compliance: {
            heading: 'Submit your {{year}} certificate'
          }
        },
        translatedRows: [
          {
            translationKey: 'compliance.heading',
            welsh: ''
          }
        ]
      })
    ).toEqual([
      {
        translationKey: 'compliance.heading',
        welsh: ''
      }
    ])
  })
})

function createWorksheet() {
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
  worksheet.getCell('D2').value =
    "Translations with syntax such as {{year}} should be preserved in the translated text, as it's a placeholder for a dynamic value"
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

async function writeWorkbook(filePath, rows) {
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

  worksheet.getRow(1).values = [
    'Translation key',
    'Parent key',
    'Section',
    'English',
    'Welsh',
    'Figma link'
  ]

  for (const row of rows) {
    worksheet.addRow({
      translationKey: row.translationKey,
      welsh: row.welsh
    })
  }

  await workbook.xlsx.writeFile(filePath)
}
