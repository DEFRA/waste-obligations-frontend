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
    const workbookPath = path.join(directory, 'xlsx', '01-home.xlsx')
    const textExportPath = path.join(directory, 'json', '01-home.json')
    const pageGroup = createPageGroup()

    await expect(
      writePageWorkbook(workbookPath, pageGroup, { textExportPath })
    ).resolves.toEqual({
      status: 'created',
      workbookStatus: 'created',
      textExportStatus: 'created'
    })

    const originalWorkbook = await fs.readFile(workbookPath)
    const originalTextExport = await fs.readFile(textExportPath, 'utf8')

    await expect(
      writePageWorkbook(workbookPath, pageGroup, { textExportPath })
    ).resolves.toEqual({
      status: 'unchanged',
      workbookStatus: 'unchanged',
      textExportStatus: 'unchanged'
    })
    await expect(fs.readFile(workbookPath)).resolves.toEqual(originalWorkbook)
    await expect(fs.readFile(textExportPath, 'utf8')).resolves.toBe(
      originalTextExport
    )

    await fs.rm(directory, { recursive: true })
  })

  test('creates a missing text export without overwriting a matching workbook', async () => {
    const directory = await fs.mkdtemp(
      path.join(os.tmpdir(), 'translation-export-')
    )
    const workbookPath = path.join(directory, 'xlsx', '01-home.xlsx')
    const textExportPath = path.join(directory, 'json', '01-home.json')
    const pageGroup = createPageGroup()

    await writePageWorkbook(workbookPath, pageGroup, { textExportPath })
    const originalWorkbook = await fs.readFile(workbookPath)
    await fs.rm(textExportPath)

    await expect(
      writePageWorkbook(workbookPath, pageGroup, { textExportPath })
    ).resolves.toEqual({
      status: 'created',
      workbookStatus: 'unchanged',
      textExportStatus: 'created'
    })
    await expect(fs.readFile(workbookPath)).resolves.toEqual(originalWorkbook)
    await expect(readJsonFile(textExportPath)).resolves.toEqual({
      translatorNotes: [
        "Translations with syntax such as {{year}} should be preserved in the translated text, as it's a placeholder for a dynamic value",
        'Reusable content is translated in: 00-shared.xlsx.'
      ],
      rows: [
        {
          translationKey: 'home.heading',
          parentKey: 'home',
          section: 'Home page',
          english: 'Home',
          welsh: 'Hafan',
          figmaUrl: 'https://www.figma.com/example'
        }
      ]
    })

    await fs.rm(directory, { recursive: true })
  })

  test('overwrites an existing workbook when translation content changes', async () => {
    const directory = await fs.mkdtemp(
      path.join(os.tmpdir(), 'translation-export-')
    )
    const workbookPath = path.join(directory, 'xlsx', '01-home.xlsx')
    const textExportPath = path.join(directory, 'json', '01-home.json')

    await writePageWorkbook(workbookPath, createPageGroup(), {
      textExportPath
    })

    await expect(
      writePageWorkbook(
        workbookPath,
        createPageGroup({
          english: 'Welcome to waste obligations'
        }),
        { textExportPath }
      )
    ).resolves.toEqual({
      status: 'updated',
      workbookStatus: 'updated',
      textExportStatus: 'updated'
    })

    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.readFile(workbookPath)

    expect(
      workbook.getWorksheet('Welsh translations').getCell('D6').value
    ).toBe('Welcome to waste obligations')
    await expect(readJsonFile(textExportPath)).resolves.toMatchObject({
      rows: [
        {
          english: 'Welcome to waste obligations'
        }
      ]
    })

    await fs.rm(directory, { recursive: true })
  })
})

async function readJsonFile(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'))
}

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
