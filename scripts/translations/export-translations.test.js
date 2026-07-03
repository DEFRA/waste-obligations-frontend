import ExcelJS from 'exceljs'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, test } from 'vitest'
import { writePageWorkbook } from './export-translations.js'

describe('export translations', () => {
  test('does not overwrite an existing workbook when translation content has not changed', async () => {
    const directory = await fs.mkdtemp(
      path.join(os.tmpdir(), 'translation-export-')
    )
    const workbookPath = path.join(directory, '01-home.xlsx')
    const pageGroup = createPageGroup()

    await expect(writePageWorkbook(workbookPath, pageGroup)).resolves.toEqual({
      status: 'created'
    })

    const originalWorkbook = await fs.readFile(workbookPath)

    await expect(writePageWorkbook(workbookPath, pageGroup)).resolves.toEqual({
      status: 'unchanged'
    })
    await expect(fs.readFile(workbookPath)).resolves.toEqual(originalWorkbook)

    await fs.rm(directory, { recursive: true })
  })

  test('overwrites an existing workbook when translation content changes', async () => {
    const directory = await fs.mkdtemp(
      path.join(os.tmpdir(), 'translation-export-')
    )
    const workbookPath = path.join(directory, '01-home.xlsx')

    await writePageWorkbook(workbookPath, createPageGroup())

    await expect(
      writePageWorkbook(
        workbookPath,
        createPageGroup({
          english: 'Welcome to waste obligations'
        })
      )
    ).resolves.toEqual({
      status: 'updated'
    })

    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.readFile(workbookPath)

    expect(
      workbook.getWorksheet('Welsh translations').getCell('D6').value
    ).toBe('Welcome to waste obligations')

    await fs.rm(directory, { recursive: true })
  })
})

function createPageGroup({ english = 'Home' } = {}) {
  return {
    fileName: '01-home.xlsx',
    notes: 'Home page',
    translatorNotes: ['Reusable content is translated in: 00-shared.xlsx.'],
    rows: [
      {
        translationKey: 'home.heading',
        parentKey: 'home',
        english,
        welsh: 'Hafan',
        figmaUrl: 'https://www.figma.com/example'
      }
    ]
  }
}
