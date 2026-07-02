import fs from 'node:fs/promises'
import path from 'node:path'

const COMPLIANCE_COMPONENT_LOCALE = {
  summaryList: 'compliance.components.summaryList',
  regulatorInset: 'compliance.components.regulatorInset',
  overallStatus: 'compliance.components.overallStatus',
  obligationsTable: 'compliance.components.obligationsTable',
  declaration: 'compliance.components.declaration',
  success: 'compliance.components.success',
  about: 'compliance.components.about'
}

const TEMPLATE_SEARCH_PATHS = [
  'src/server/routes',
  'src/server/common/templates',
  'src/server/common/components'
]

export async function readJsonFile(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'))
}

export async function writeJsonFile(filePath, value) {
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`)
}

export function flattenTranslations(translations, path = []) {
  return Object.entries(translations).flatMap(([key, value]) => {
    const nextPath = [...path, key]

    if (typeof value === 'string') {
      return [{ key: nextPath.join('.'), value }]
    }

    if (isRecord(value)) {
      return flattenTranslations(value, nextPath)
    }

    return []
  })
}

export function getTranslationValue(translations, key) {
  return key.split('.').reduce((current, part) => {
    if (!isRecord(current)) {
      return undefined
    }

    return current[part]
  }, translations)
}

export function setTranslationValue(translations, key, value) {
  const parts = key.split('.')
  const finalKey = parts.pop()
  const parent = parts.reduce((current, part) => {
    if (!isRecord(current[part])) {
      current[part] = {}
    }

    return current[part]
  }, translations)

  parent[finalKey] = value
}

export function findParentKey(translationKey, pageMatrix) {
  const parts = translationKey.split('.')

  for (let index = parts.length - 1; index > 0; index--) {
    const parentKey = parts.slice(0, index).join('.')

    if (pageMatrix[parentKey]) {
      return parentKey
    }
  }
}

export function normalizePageMatrix(pageMatrix) {
  const pageEntries = pageMatrix.pages ?? pageMatrix

  return Object.entries(pageEntries).map(([id, page], index) => ({
    id,
    index,
    route: page.route ?? '',
    template: page.template ?? '',
    fileName: page.fileName ?? `${id}.xlsx`,
    localeBase: page.localeBase ?? null,
    figmaUrl: page.figmaUrl ?? '',
    notes: page.notes ?? id,
    translatorNotes: page.translatorNotes ?? [],
    translationKeys: page.translationKeys ?? [],
    translationKeyPrefixes: page.translationKeyPrefixes ?? []
  }))
}

export function buildWelshTranslations({
  englishTranslations,
  currentWelshTranslations,
  translatedRows
}) {
  const nextWelshTranslations = structuredClone(englishTranslations)

  for (const { key } of flattenTranslations(englishTranslations)) {
    const currentWelshValue = getTranslationValue(currentWelshTranslations, key)

    if (typeof currentWelshValue === 'string') {
      setTranslationValue(nextWelshTranslations, key, currentWelshValue)
    }
  }

  for (const row of translatedRows) {
    const englishValue = getTranslationValue(
      englishTranslations,
      row.translationKey
    )

    if (typeof englishValue !== 'string') {
      throw new Error(
        `Translation key "${row.translationKey}" does not exist in en.json`
      )
    }

    if (row.welsh) {
      setTranslationValue(nextWelshTranslations, row.translationKey, row.welsh)
    }
  }

  return nextWelshTranslations
}

export function buildTranslationRows({
  englishTranslations,
  welshTranslations,
  pageMatrix
}) {
  validateExportTranslationValues(englishTranslations)

  return flattenTranslations(englishTranslations).map((translation) => {
    const welshValue = getTranslationValue(welshTranslations, translation.key)
    const welsh =
      typeof welshValue === 'string' && welshValue !== translation.value
        ? welshValue
        : ''
    const parentKey = findParentKey(translation.key, pageMatrix)

    if (!parentKey) {
      throw new Error(
        `No page matrix entry found for translation key "${translation.key}"`
      )
    }

    return {
      translationKey: translation.key,
      parentKey,
      english: translation.value,
      welsh,
      figmaUrl: pageMatrix[parentKey].figmaUrl,
      generic: Boolean(pageMatrix[parentKey].generic),
      notes: pageMatrix[parentKey].notes ?? ''
    }
  })
}

export async function buildPageTranslationGroups({
  englishTranslations,
  welshTranslations,
  pageMatrix,
  projectRoot
}) {
  validateExportTranslationValues(englishTranslations)

  const pages = normalizePageMatrix(pageMatrix)
  const englishKeys = flattenTranslations(englishTranslations).map(
    ({ key }) => key
  )
  const translationKeyOwners = new Map()
  const pageGroups = []

  for (const page of pages) {
    const translationKeys = await getPageTranslationKeys({
      page,
      englishTranslations,
      englishKeys,
      projectRoot
    })
    const pageTranslationKeys = []
    const reusedContentOwners = new Map()

    for (const translationKey of translationKeys) {
      const owner = translationKeyOwners.get(translationKey)

      if (owner) {
        reusedContentOwners.set(owner.id, owner)
        continue
      }

      translationKeyOwners.set(translationKey, page)
      pageTranslationKeys.push(translationKey)
    }

    pageGroups.push({
      ...page,
      translatorNotes: [
        ...page.translatorNotes,
        ...buildReusedContentTranslatorNotes(reusedContentOwners)
      ],
      rows: buildTranslationRowsForPage({
        page,
        translationKeys: pageTranslationKeys,
        englishTranslations,
        welshTranslations
      })
    })
  }

  return pageGroups
}

export async function getPageTranslationKeys({
  page,
  englishTranslations,
  englishKeys,
  projectRoot
}) {
  const translationKeys = new Set(page.translationKeys)

  for (const prefix of page.translationKeyPrefixes) {
    for (const translationKey of englishKeys) {
      if (
        translationKey === prefix ||
        translationKey.startsWith(`${prefix}.`)
      ) {
        translationKeys.add(translationKey)
      }
    }
  }

  if (page.localeBase) {
    addDirectStringChildren(
      translationKeys,
      englishTranslations,
      page.localeBase
    )
  }

  if (page.template) {
    for (const translationKey of await extractTemplateTranslationKeys({
      template: page.template,
      localeBase: page.localeBase,
      englishTranslations,
      projectRoot
    })) {
      translationKeys.add(translationKey)
    }
  }

  return englishKeys.filter((translationKey) =>
    translationKeys.has(translationKey)
  )
}

export async function extractTemplateTranslationKeys({
  template,
  localeBase,
  englishTranslations,
  projectRoot
}) {
  const templates = await collectTemplateSources({
    template,
    projectRoot
  })
  const source = templates.map(({ source }) => source).join('\n')
  const translationKeys = new Set()
  const stringVariables = collectStringVariables(source)
  const baseVariables = new Map(stringVariables)

  if (localeBase) {
    baseVariables.set('localeBase', localeBase)
  }

  const i18nAliases = collectI18nAliases(source, baseVariables)

  if (localeBase) {
    i18nAliases.set('params.i18n', localeBase)
    i18nAliases.set('i18n', localeBase)
  }

  for (const translationKey of matchAll(
    source,
    /t\(locale,\s*['"]([^'"]+)['"]/g
  )) {
    translationKeys.add(translationKey)
  }

  for (const [alias, base] of i18nAliases) {
    addPageTranslationCalls({
      source,
      alias,
      base,
      translationKeys,
      englishTranslations,
      stringVariables
    })
  }

  return [...translationKeys]
}

export function buildTranslationRowsForPage({
  page,
  translationKeys,
  englishTranslations,
  welshTranslations
}) {
  return translationKeys.map((translationKey) => {
    const english = getTranslationValue(englishTranslations, translationKey)

    if (typeof english !== 'string') {
      throw new Error(
        `Translation key "${translationKey}" does not exist in en.json`
      )
    }

    const welshValue = getTranslationValue(welshTranslations, translationKey)
    const welsh =
      typeof welshValue === 'string' && welshValue !== english ? welshValue : ''

    return {
      translationKey,
      parentKey: page.id,
      english,
      welsh,
      figmaUrl: page.figmaUrl,
      generic: false,
      notes: page.notes
    }
  })
}

export function validateExportTranslationValues(englishTranslations) {
  const invalidTranslationKeys = flattenTranslations(englishTranslations)
    .filter(({ value }) => value.trim() !== value)
    .map(({ key }) => key)

  if (invalidTranslationKeys.length === 0) {
    return
  }

  throw new Error(
    `English translation values must not include leading or trailing whitespace. Move spacing into the layout before exporting translations:\n${invalidTranslationKeys.map((key) => `- ${key}`).join('\n')}`
  )
}

function buildReusedContentTranslatorNotes(reusedContentOwners) {
  if (reusedContentOwners.size === 0) {
    return []
  }

  const fileNames = [...reusedContentOwners.values()]
    .sort((left, right) => left.index - right.index)
    .map((owner) => owner.fileName)

  return [
    `Reusable content rendered on this page is translated in: ${fileNames.join(', ')}.`
  ]
}

async function collectTemplateSources({
  template,
  projectRoot,
  visited = new Set()
}) {
  const filePath = await resolveTemplatePath(projectRoot, template)

  if (visited.has(filePath)) {
    return []
  }

  visited.add(filePath)

  const source = await fs.readFile(filePath, 'utf8')
  const templates = [{ filePath, source }]
  const references = [
    ...matchAll(source, /{%\s*extends\s+['"]([^'"]+)['"]/g),
    ...matchAll(source, /{%\s*include\s+['"]([^'"]+)['"]/g),
    ...matchAll(source, /{%\s*from\s+['"]([^'"]+)['"]\s+import/g)
  ]

  for (const reference of references) {
    if (reference.startsWith('govuk/')) {
      continue
    }

    templates.push(
      ...(await collectTemplateSources({
        template: reference,
        projectRoot,
        visited
      }))
    )
  }

  return templates
}

async function resolveTemplatePath(projectRoot, template) {
  const templateName = template.endsWith('.njk') ? template : `${template}.njk`

  for (const searchPath of TEMPLATE_SEARCH_PATHS) {
    const candidate = path.join(projectRoot, searchPath, templateName)

    try {
      await fs.access(candidate)
      return candidate
    } catch {}
  }

  throw new Error(`Could not resolve template "${template}"`)
}

function collectStringVariables(source) {
  return new Map(
    [...source.matchAll(/{%\s*set\s+(\w+)\s*=\s*['"]([^'"]+)['"]\s*%}/g)].map(
      ([, name, value]) => [name, value]
    )
  )
}

function collectI18nAliases(source, baseVariables) {
  const aliases = new Map()

  for (const [, alias, baseExpression] of source.matchAll(
    /{%\s*set\s+(\w+)\s*=\s*pageI18n\(locale,\s*([^)]+)\)\s*%}/g
  )) {
    const base = resolveStringExpression(baseExpression.trim(), baseVariables)

    if (base) {
      aliases.set(alias, base)
    }
  }

  if (!aliases.has('p') && baseVariables.has('localeBase')) {
    aliases.set('p', baseVariables.get('localeBase'))
  }

  return aliases
}

function addPageTranslationCalls({
  source,
  alias,
  base,
  translationKeys,
  englishTranslations,
  stringVariables
}) {
  const escapedAlias = escapeRegExp(alias)

  for (const key of matchAll(
    source,
    new RegExp(`${escapedAlias}\\.t\\(\\s*['"]([^'"]+)['"]`, 'g')
  )) {
    translationKeys.add(`${base}.${key}`)
  }

  for (const [, component, key] of source.matchAll(
    new RegExp(
      `${escapedAlias}\\.ct\\(\\s*['"]([^'"]+)['"]\\s*,\\s*['"]([^'"]+)['"]`,
      'g'
    )
  )) {
    translationKeys.add(
      resolveComponentTranslationKey(englishTranslations, base, component, key)
    )
  }

  for (const [, component, variableName] of source.matchAll(
    new RegExp(
      `${escapedAlias}\\.ct\\(\\s*['"]([^'"]+)['"]\\s*,\\s*(\\w+)`,
      'g'
    )
  )) {
    const key = stringVariables.get(variableName)

    if (key) {
      translationKeys.add(
        resolveComponentTranslationKey(
          englishTranslations,
          base,
          component,
          key
        )
      )
    }
  }

  for (const [, component, key] of source.matchAll(
    new RegExp(
      `${escapedAlias}\\.ck\\(\\s*['"]([^'"]+)['"]\\s*,\\s*['"]([^'"]+)['"]`,
      'g'
    )
  )) {
    translationKeys.add(
      resolveComponentTranslationKey(englishTranslations, base, component, key)
    )
  }
}

function addDirectStringChildren(translationKeys, translations, base) {
  const value = getTranslationValue(translations, base)

  if (!isRecord(value)) {
    return
  }

  for (const [key, childValue] of Object.entries(value)) {
    if (typeof childValue === 'string') {
      translationKeys.add(`${base}.${key}`)
    }
  }
}

function resolveComponentTranslationKey(
  translations,
  pageLocaleBase,
  component,
  key
) {
  const pageKey = `${pageLocaleBase}.components.${component}.${key}`

  if (typeof getTranslationValue(translations, pageKey) === 'string') {
    return pageKey
  }

  const componentBase = COMPLIANCE_COMPONENT_LOCALE[component]

  return componentBase ? `${componentBase}.${key}` : pageKey
}

function resolveStringExpression(expression, variables) {
  const literal = expression.match(/^['"]([^'"]+)['"]$/)

  if (literal) {
    return literal[1]
  }

  return variables.get(expression)
}

function matchAll(source, regex) {
  return [...source.matchAll(regex)].map((match) => match[1])
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
