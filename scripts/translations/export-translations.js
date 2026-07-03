import ExcelJS from 'exceljs'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  buildPageTranslationGroups,
  readJsonFile
} from './translation-utils.js'
import { calculateTranslationRowHeight } from './worksheet-formatting.js'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(dirname, '../..')

const defaultOutputPath = path.join(
  projectRoot,
  'translations',
  'welsh-translations'
)
const translatorInstructions = [
  "Translations with syntax such as {{year}} should be preserved in the translated text, as it's a placeholder for a dynamic value"
]
const visibleTranslationColumns = [
  { key: 'english', width: 70 },
  { key: 'welsh', width: 70 },
  { key: 'figmaUrl', width: 45 }
]

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  await exportTranslations()
}

export async function exportTranslations({ output = getOutputPath() } = {}) {
  const paths = {
    english: path.join(projectRoot, 'src/server/locales/en.json'),
    welsh: path.join(projectRoot, 'src/server/locales/cy.json'),
    pageMatrix: path.join(projectRoot, 'scripts/translations/page-matrix.json'),
    output
  }

  const [englishTranslations, welshTranslations, pageMatrix] =
    await Promise.all([
      readJsonFile(paths.english),
      readJsonFile(paths.welsh),
      readJsonFile(paths.pageMatrix)
    ])

  const pageGroups = await buildPageTranslationGroups({
    englishTranslations,
    welshTranslations,
    pageMatrix,
    projectRoot
  })

  await fs.mkdir(paths.output, { recursive: true })

  const workbookCounts = {
    created: 0,
    updated: 0,
    unchanged: 0
  }
  let totalRows = 0

  for (const pageGroup of pageGroups) {
    const outputPath = path.join(paths.output, pageGroup.fileName)
    const result = await writePageWorkbook(outputPath, pageGroup)

    workbookCounts[result.status] += 1
    totalRows += pageGroup.rows.length
    console.log(
      `${formatWorkbookStatus(result.status)} ${outputPath} (${pageGroup.rows.length} row${pageGroup.rows.length === 1 ? '' : 's'})`
    )
  }

  console.log(
    `Created ${workbookCounts.created}, updated ${workbookCounts.updated} and left ${workbookCounts.unchanged} unchanged`
  )
  console.log(
    `Included ${totalRows} translation row${totalRows === 1 ? '' : 's'}`
  )
}

function getOutputPath() {
  const outputFlagIndex = process.argv.indexOf('--output')

  if (outputFlagIndex === -1) {
    return defaultOutputPath
  }

  const outputPath = process.argv[outputFlagIndex + 1]

  if (!outputPath) {
    throw new Error('Missing value for --output')
  }

  return path.resolve(projectRoot, outputPath)
}

export async function writePageWorkbook(outputPath, pageGroup) {
  const expectedWorkbook = buildWorkbookComparisonData(pageGroup)
  const outputExists = await fileExists(outputPath)

  if (
    outputExists &&
    (await workbookMatchesComparisonData(outputPath, expectedWorkbook))
  ) {
    return { status: 'unchanged' }
  }

  const workbook = buildPageWorkbook(pageGroup)

  await workbook.xlsx.writeFile(outputPath)

  return { status: outputExists ? 'updated' : 'created' }
}

function buildPageWorkbook(pageGroup) {
  const worksheetInstructions = [
    ...translatorInstructions,
    ...(pageGroup.translatorNotes ?? [])
  ]
  const headerRowNumber = worksheetInstructions.length + 3
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'waste-obligations-frontend'
  workbook.created = new Date()

  const worksheet = workbook.addWorksheet('Welsh translations', {
    views: [{ state: 'frozen', ySplit: headerRowNumber }]
  })

  worksheet.columns = [
    { key: 'translationKey', width: 50, hidden: true },
    { key: 'parentKey', width: 35, hidden: true },
    { key: 'section', width: 35, hidden: true },
    { key: 'english', width: 70 },
    { key: 'welsh', width: 70 },
    { key: 'figmaUrl', width: 45 }
  ]

  addTranslatorInstructions(worksheet, worksheetInstructions)
  addHeaderRow(worksheet, headerRowNumber)
  addTranslationRows(worksheet, pageGroup)
  setTranslationAutoFilter(worksheet, headerRowNumber)

  includeFigmaLinkOnce(worksheet, headerRowNumber)
  formatWorksheet(worksheet, headerRowNumber)

  return workbook
}

function addTranslatorInstructions(worksheet, instructions) {
  worksheet.mergeCells('D1:F1')
  worksheet.getCell('D1').value = 'Translator notes'
  worksheet.getCell('D1').font = { bold: true, size: 14 }

  instructions.forEach((instruction, index) => {
    worksheet.mergeCells(`D${index + 2}:F${index + 2}`)
    worksheet.getCell(`D${index + 2}`).value = instruction
  })
}

function addHeaderRow(worksheet, headerRowNumber) {
  worksheet.getRow(headerRowNumber).values = [
    'Translation key',
    'Parent key',
    'Section',
    'English',
    'Welsh',
    'Figma link'
  ]
}

function addTranslationRows(worksheet, pageGroup) {
  for (const row of pageGroup.rows) {
    const worksheetRow = worksheet.addRow({
      translationKey: row.translationKey,
      parentKey: row.parentKey,
      section: pageGroup.notes,
      english: row.english,
      welsh: row.welsh,
      figmaUrl: row.figmaUrl
    })

    if (!row.figmaUrl) {
      continue
    }

    worksheetRow.getCell('figmaUrl').value = {
      text: row.figmaUrl,
      hyperlink: row.figmaUrl
    }
  }
}

function setTranslationAutoFilter(worksheet, headerRowNumber) {
  worksheet.autoFilter = {
    from: `A${headerRowNumber}`,
    to: `F${worksheet.rowCount}`
  }
}

function formatWorksheet(worksheet, headerRowNumber) {
  worksheet.getRow(1).height = 24

  for (let rowNumber = 2; rowNumber < headerRowNumber; rowNumber++) {
    worksheet.getRow(rowNumber).height = 36
  }

  const headerRow = worksheet.getRow(headerRowNumber)
  headerRow.height = 24
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1D70B8' }
  }

  worksheet.eachRow((row, rowNumber) => {
    row.alignment = { vertical: 'top', wrapText: true }

    if (rowNumber > headerRowNumber) {
      row.height = calculateTranslationRowHeight(
        visibleTranslationColumns.map(({ key, width }) => ({
          value: row.getCell(key).value,
          width
        }))
      )
    }
  })
}

function includeFigmaLinkOnce(worksheet, headerRowNumber) {
  let hasIncludedFigmaLink = false

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber <= headerRowNumber) {
      return
    }

    const figmaCell = row.getCell('figmaUrl')
    const figmaUrl = figmaCell.value?.hyperlink ?? figmaCell.value

    if (!figmaUrl) {
      return
    }

    if (hasIncludedFigmaLink) {
      figmaCell.value = ''
      return
    }

    hasIncludedFigmaLink = true
  })
}

function buildWorkbookComparisonData(pageGroup) {
  let hasIncludedFigmaLink = false

  return {
    translatorNotes: [
      ...translatorInstructions,
      ...(pageGroup.translatorNotes ?? [])
    ].map(normalizeCellText),
    rows: pageGroup.rows.map((row) => {
      const figmaUrl = row.figmaUrl && !hasIncludedFigmaLink ? row.figmaUrl : ''

      if (row.figmaUrl) {
        hasIncludedFigmaLink = true
      }

      return {
        translationKey: normalizeCellText(row.translationKey),
        parentKey: normalizeCellText(row.parentKey),
        section: normalizeCellText(pageGroup.notes),
        english: normalizeCellText(row.english),
        welsh: normalizeCellText(row.welsh),
        figmaUrl: normalizeCellText(figmaUrl)
      }
    })
  }
}

async function workbookMatchesComparisonData(outputPath, expectedWorkbook) {
  try {
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.readFile(outputPath)

    return (
      JSON.stringify(readWorkbookComparisonData(workbook)) ===
      JSON.stringify(expectedWorkbook)
    )
  } catch {
    return false
  }
}

function readWorkbookComparisonData(workbook) {
  const worksheet =
    workbook.getWorksheet('Welsh translations') ?? workbook.worksheets[0]

  if (!worksheet) {
    throw new Error('Workbook does not contain any worksheets')
  }

  const { headerRowNumber, columns } = findExportHeaderColumns(worksheet)

  return {
    translatorNotes: readTranslatorNotes(worksheet, headerRowNumber, columns),
    rows: readTranslationRows(worksheet, headerRowNumber, columns)
  }
}

function readTranslatorNotes(worksheet, headerRowNumber, columns) {
  const translatorNotes = []

  for (let rowNumber = 2; rowNumber < headerRowNumber - 1; rowNumber++) {
    translatorNotes.push(
      getCellText(worksheet.getRow(rowNumber).getCell(columns.english))
    )
  }

  return translatorNotes
}

function readTranslationRows(worksheet, headerRowNumber, columns) {
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
      parentKey: getCellText(row.getCell(columns.parentKey)),
      section: getCellText(row.getCell(columns.section)),
      english: getCellText(row.getCell(columns.english)),
      welsh: getCellText(row.getCell(columns.welsh)),
      figmaUrl: getCellText(row.getCell(columns.figmaUrl))
    })
  }

  return rows
}

function findExportHeaderColumns(worksheet) {
  for (let rowNumber = 1; rowNumber <= worksheet.rowCount; rowNumber++) {
    const row = worksheet.getRow(rowNumber)
    const headers = {}

    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const value = getCellText(cell)

      if (value) {
        headers[value] = colNumber
      }
    })

    if (
      headers['Translation key'] &&
      headers['Parent key'] &&
      headers.Section &&
      headers.English &&
      headers.Welsh &&
      headers['Figma link']
    ) {
      return {
        headerRowNumber: rowNumber,
        columns: {
          translationKey: headers['Translation key'],
          parentKey: headers['Parent key'],
          section: headers.Section,
          english: headers.English,
          welsh: headers.Welsh,
          figmaUrl: headers['Figma link']
        }
      }
    }
  }

  throw new Error('Workbook is missing required translation export columns')
}

function getCellText(cell) {
  return normalizeCellText(cell.value)
}

function normalizeCellText(value) {
  if (value === null || value === undefined) {
    return ''
  }

  if (typeof value === 'object') {
    if ('text' in value) {
      return value.text.trim()
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

async function fileExists(filePath) {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

function formatWorkbookStatus(status) {
  return {
    created: 'Created',
    updated: 'Updated',
    unchanged: 'Unchanged'
  }[status]
}
