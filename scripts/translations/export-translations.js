import ExcelJS from 'exceljs'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildTranslationRows, readJsonFile } from './translation-utils.js'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(dirname, '../..')

const defaultOutputPath = path.join(projectRoot, 'translations', 'welsh-translations.xlsx')
const translatorInstructions = [
  'Translations with syntax such as {{year}} should be preserved in the translated text, as it\'s a placeholder for a dynamic value'
]
const headerRowNumber = translatorInstructions.length + 3

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

const rows = buildTranslationRows({
  englishTranslations,
  welshTranslations,
  pageMatrix
})

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

addTranslatorInstructions(worksheet)
addHeaderRow(worksheet)

for (const row of rows) {
  const worksheetRow = worksheet.addRow({
    translationKey: row.translationKey,
    parentKey: row.parentKey,
    section: row.parentKey,
    english: row.english,
    welsh: row.welsh,
    figmaUrl: row.figmaUrl
  })

  if (row.figmaUrl) {
    worksheetRow.getCell('figmaUrl').value = {
      text: row.figmaUrl,
      hyperlink: row.figmaUrl
    }
  }
}

worksheet.autoFilter = {
  from: `D${headerRowNumber}`,
  to: `F${headerRowNumber}`
}

includeFigmaLinksOncePerParent(worksheet, headerRowNumber)
formatWorksheet(worksheet, headerRowNumber)

await fs.mkdir(path.dirname(paths.output), { recursive: true })
await workbook.xlsx.writeFile(paths.output)

console.log(`Created ${paths.output}`)
console.log(`Included ${rows.length} translation row${rows.length === 1 ? '' : 's'}`)

function getOutputPath () {
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

function addTranslatorInstructions (worksheet) {
  worksheet.mergeCells('D1:F1')
  worksheet.getCell('D1').value = 'Translator notes'
  worksheet.getCell('D1').font = { bold: true, size: 14 }

  translatorInstructions.forEach((instruction, index) => {
    worksheet.mergeCells(`D${index + 2}:F${index + 2}`)
    worksheet.getCell(`D${index + 2}`).value = instruction
  })
}

function addHeaderRow (worksheet) {
  worksheet.getRow(headerRowNumber).values = [
    'Translation key',
    'Parent key',
    'Section',
    'English',
    'Welsh',
    'Figma link'
  ]
}

function formatWorksheet (worksheet, headerRowNumber) {
  const headerRow = worksheet.getRow(headerRowNumber)
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1D70B8' }
  }

  worksheet.eachRow((row, rowNumber) => {
    row.alignment = { vertical: 'top', wrapText: true }

    if (rowNumber > headerRowNumber) {
      row.height = 48
    }
  })
}

function includeFigmaLinksOncePerParent (worksheet, headerRowNumber) {
  const parentKeysWithFigmaLinks = new Set()

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber <= headerRowNumber) {
      return
    }

    const parentKey = row.getCell('parentKey').value
    const figmaCell = row.getCell('figmaUrl')
    const figmaUrl = figmaCell.value?.hyperlink ?? figmaCell.value

    if (!figmaUrl) {
      return
    }

    if (parentKeysWithFigmaLinks.has(parentKey)) {
      figmaCell.value = ''
      return
    }

    parentKeysWithFigmaLinks.add(parentKey)
  })
}
