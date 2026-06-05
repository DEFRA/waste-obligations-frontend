import ExcelJS from 'exceljs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  buildWelshTranslations,
  readJsonFile,
  writeJsonFile
} from './translation-utils.js'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(dirname, '../..')

const defaultInputPath = path.join(projectRoot, 'translations', 'welsh-translations.xlsx')
const defaultOutputPath = path.join(projectRoot, 'src/server/locales/cy.json')

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  await importTranslations()
}

export async function importTranslations () {
  const paths = {
    english: path.join(projectRoot, 'src/server/locales/en.json'),
    welsh: path.join(projectRoot, 'src/server/locales/cy.json'),
    input: getPathFromFlag('--input', defaultInputPath),
    output: getPathFromFlag('--output', defaultOutputPath)
  }

  const [englishTranslations, currentWelshTranslations] = await Promise.all([
    readJsonFile(paths.english),
    readJsonFile(paths.welsh)
  ])

  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.readFile(paths.input)

  const worksheet = workbook.getWorksheet('Welsh translations') ?? workbook.worksheets[0]
  const translatedRows = getTranslatedRowsFromWorksheet(worksheet)
  const importedRows = translatedRows.filter((row) => row.welsh)
  const nextWelshTranslations = buildWelshTranslations({
    englishTranslations,
    currentWelshTranslations,
    translatedRows
  })

  await writeJsonFile(paths.output, nextWelshTranslations)

  console.log(`Updated ${paths.output}`)
  console.log(`Imported ${importedRows.length} translated value${importedRows.length === 1 ? '' : 's'}`)
}

export function getTranslatedRowsFromWorksheet (worksheet) {
  if (!worksheet) {
    throw new Error('Workbook does not contain any worksheets')
  }

  const { headerRowNumber, columns } = findHeaderColumns(worksheet)
  const rows = []

  for (let rowNumber = headerRowNumber + 1; rowNumber <= worksheet.rowCount; rowNumber++) {
    const row = worksheet.getRow(rowNumber)
    const translationKey = getCellText(row.getCell(columns.translationKey))

    if (!translationKey) {
      continue
    }

    rows.push({
      translationKey,
      welsh: getCellText(row.getCell(columns.welsh))
    })
  }

  return rows
}

export function findHeaderColumns (worksheet) {
  for (let rowNumber = 1; rowNumber <= worksheet.rowCount; rowNumber++) {
    const row = worksheet.getRow(rowNumber)
    const headers = {}

    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const value = getCellText(cell)

      if (value) {
        headers[value] = colNumber
      }
    })

    if (headers['Translation key'] && headers.Welsh) {
      return {
        headerRowNumber: rowNumber,
        columns: {
          translationKey: headers['Translation key'],
          welsh: headers.Welsh
        }
      }
    }
  }

  throw new Error('Workbook is missing required Translation key and Welsh columns')
}

function getPathFromFlag (flagName, defaultPath) {
  const flagIndex = process.argv.indexOf(flagName)

  if (flagIndex === -1) {
    return defaultPath
  }

  const flagValue = process.argv[flagIndex + 1]

  if (!flagValue) {
    throw new Error(`Missing value for ${flagName}`)
  }

  return path.resolve(projectRoot, flagValue)
}

function getCellText (cell) {
  const value = cell.value

  if (value === null || value === undefined) {
    return ''
  }

  if (typeof value === 'object') {
    if ('text' in value) {
      return value.text
    }

    if ('richText' in value) {
      return value.richText.map((part) => part.text).join('').trim()
    }
  }

  return String(value).trim()
}
