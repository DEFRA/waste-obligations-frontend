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

const paths = {
  english: path.join(projectRoot, 'src/server/locales/en.json'),
  welsh: path.join(projectRoot, 'src/server/locales/cy.json'),
  pageMatrix: path.join(projectRoot, 'scripts/translations/page-matrix.json'),
  output: getOutputPath()
}

const [englishTranslations, welshTranslations, pageMatrix] = await Promise.all([
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

let totalRows = 0

for (const pageGroup of pageGroups) {
  const outputPath = path.join(paths.output, pageGroup.fileName)

  await writePageWorkbook(outputPath, pageGroup)
  totalRows += pageGroup.rows.length
  console.log(
    `Created ${outputPath} (${pageGroup.rows.length} row${pageGroup.rows.length === 1 ? '' : 's'})`
  )
}

console.log(
  `Created ${pageGroups.length} translation workbook${pageGroups.length === 1 ? '' : 's'}`
)
console.log(
  `Included ${totalRows} translation row${totalRows === 1 ? '' : 's'}`
)

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

async function writePageWorkbook(outputPath, pageGroup) {
  const worksheetInstructions = [
    ...translatorInstructions,
    ...pageGroup.translatorNotes
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

  await workbook.xlsx.writeFile(outputPath)
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
