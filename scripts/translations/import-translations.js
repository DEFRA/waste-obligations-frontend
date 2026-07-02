import ExcelJS from 'exceljs'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  buildWelshTranslations,
  getTranslationValue,
  readJsonFile,
  writeJsonFile
} from './translation-utils.js'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(dirname, '../..')

const defaultInputPath = path.join(
  projectRoot,
  'translations',
  'welsh-translations'
)
const defaultOutputPath = path.join(projectRoot, 'src/server/locales/cy.json')

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  await importTranslations()
}

export async function importTranslations() {
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

  const translatedRows = validateTranslatedRowPlaceholders({
    englishTranslations,
    translatedRows: await getTranslatedRowsFromInputPath(paths.input)
  })
  const importedRows = translatedRows.filter((row) => row.welsh)
  const nextWelshTranslations = buildWelshTranslations({
    englishTranslations,
    currentWelshTranslations,
    translatedRows
  })

  await writeJsonFile(paths.output, nextWelshTranslations)

  console.log(`Updated ${paths.output}`)
  console.log(
    `Imported ${importedRows.length} translated value${importedRows.length === 1 ? '' : 's'}`
  )
}

export async function getTranslatedRowsFromInputPath(inputPath) {
  const workbookPaths = await getWorkbookPaths(inputPath)
  const translatedRows = []

  for (const workbookPath of workbookPaths) {
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.readFile(workbookPath)

    const worksheet =
      workbook.getWorksheet('Welsh translations') ?? workbook.worksheets[0]

    translatedRows.push(...getTranslatedRowsFromWorksheet(worksheet))
  }

  return rejectConflictingTranslations(translatedRows)
}

async function getWorkbookPaths(inputPath) {
  const stats = await fs.stat(inputPath)

  if (!stats.isDirectory()) {
    return [inputPath]
  }

  const dirents = await fs.readdir(inputPath, { withFileTypes: true })

  return dirents
    .filter((dirent) => dirent.isFile() && dirent.name.endsWith('.xlsx'))
    .map((dirent) => path.join(inputPath, dirent.name))
    .sort()
}

export function getTranslatedRowsFromWorksheet(worksheet) {
  if (!worksheet) {
    throw new Error('Workbook does not contain any worksheets')
  }

  const { headerRowNumber, columns } = findHeaderColumns(worksheet)
  const rows = []

  for (
    let rowNumber = headerRowNumber + 1;
    rowNumber <= worksheet.rowCount;
    rowNumber++
  ) {
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

export function validateTranslatedRowPlaceholders({
  englishTranslations,
  translatedRows
}) {
  const errors = []

  for (const row of translatedRows) {
    if (!row.welsh) {
      continue
    }

    const englishValue = getTranslationValue(
      englishTranslations,
      row.translationKey
    )

    if (typeof englishValue !== 'string') {
      throw new Error(
        `Translation key "${row.translationKey}" does not exist in en.json`
      )
    }

    const requiredPlaceholders = extractPlaceholders(englishValue)

    if (requiredPlaceholders.length === 0) {
      continue
    }

    const welshPlaceholders = new Set(extractPlaceholders(row.welsh))
    const missingPlaceholders = requiredPlaceholders.filter(
      (placeholder) => !welshPlaceholders.has(placeholder)
    )

    if (missingPlaceholders.length > 0) {
      errors.push(
        `Translation key "${row.translationKey}" is missing ${formatPlaceholderList(missingPlaceholders)}`
      )
    }
  }

  if (errors.length > 0) {
    throw new Error(
      `Imported Welsh translations are missing required placeholders:\n${errors.join('\n')}`
    )
  }

  return translatedRows
}

export function extractPlaceholders(value) {
  const placeholders = []
  const seenPlaceholders = new Set()
  const decodedValue = decodeHtmlEntities(value)

  for (const [, placeholder] of decodedValue.matchAll(
    /\{\{\s*([^{}]+?)\s*\}\}/g
  )) {
    const normalizedPlaceholder = placeholder.trim()

    if (seenPlaceholders.has(normalizedPlaceholder)) {
      continue
    }

    seenPlaceholders.add(normalizedPlaceholder)
    placeholders.push(normalizedPlaceholder)
  }

  return placeholders
}

export function findHeaderColumns(worksheet) {
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

  throw new Error(
    'Workbook is missing required Translation key and Welsh columns'
  )
}

function getPathFromFlag(flagName, defaultPath) {
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

function getCellText(cell) {
  const value = cell.value

  if (value === null || value === undefined) {
    return ''
  }

  if (typeof value === 'object') {
    if ('text' in value) {
      return value.text
    }

    if ('richText' in value) {
      return value.richText
        .map((part) => part.text)
        .join('')
        .trim()
    }
  }

  return String(value).trim()
}

function formatPlaceholderList(placeholders) {
  const formattedPlaceholders = placeholders.map(
    (placeholder) => `{{${placeholder}}}`
  )

  return `placeholder${placeholders.length === 1 ? '' : 's'} ${formattedPlaceholders.join(', ')}`
}

function decodeHtmlEntities(value) {
  let decodedValue = value

  for (let index = 0; index < 5; index++) {
    const nextValue = decodedValue.replace(
      /&(#x[\da-f]+|#\d+|[a-z][\da-z]+);/gi,
      decodeHtmlEntity
    )

    if (nextValue === decodedValue) {
      break
    }

    decodedValue = nextValue
  }

  return decodedValue
}

function decodeHtmlEntity(entity, code) {
  const normalizedCode = code.toLowerCase()

  if (normalizedCode.startsWith('#x')) {
    return decodeCodePoint(entity, normalizedCode.slice(2), 16)
  }

  if (normalizedCode.startsWith('#')) {
    return decodeCodePoint(entity, normalizedCode.slice(1), 10)
  }

  return (
    {
      amp: '&',
      apos: "'",
      gt: '>',
      lbrace: '{',
      lcub: '{',
      lt: '<',
      nbsp: ' ',
      quot: '"',
      rbrace: '}',
      rcub: '}'
    }[normalizedCode] ?? entity
  )
}

function decodeCodePoint(entity, value, radix) {
  const codePoint = Number.parseInt(value, radix)

  if (Number.isNaN(codePoint)) {
    return entity
  }

  try {
    return String.fromCodePoint(codePoint)
  } catch {
    return entity
  }
}

function rejectConflictingTranslations(translatedRows) {
  const translatedValues = new Map()

  for (const row of translatedRows) {
    if (!row.welsh) {
      continue
    }

    const existingValue = translatedValues.get(row.translationKey)

    if (existingValue && existingValue !== row.welsh) {
      throw new Error(
        `Conflicting Welsh values found for translation key "${row.translationKey}"`
      )
    }

    translatedValues.set(row.translationKey, row.welsh)
  }

  return translatedRows
}
