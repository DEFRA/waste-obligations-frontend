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
  const englishKeySet = new Set(englishKeys)
  const orderedKeys = []
  const seen = new Set()

  const addKey = (translationKey) => {
    if (!englishKeySet.has(translationKey) || seen.has(translationKey)) {
      return
    }

    seen.add(translationKey)
    orderedKeys.push(translationKey)
  }

  // Page title / heading style keys first — usually the top of the page.
  if (page.localeBase) {
    const localeBaseKeys = new Set()
    addDirectStringChildren(
      localeBaseKeys,
      englishTranslations,
      page.localeBase
    )

    for (const translationKey of localeBaseKeys) {
      addKey(translationKey)
    }
  }

  // Then keys in the order they appear when the page is rendered.
  if (page.template) {
    for (const translationKey of await extractTemplateTranslationKeys({
      template: page.template,
      localeBase: page.localeBase,
      englishTranslations,
      projectRoot
    })) {
      addKey(translationKey)
    }
  }

  for (const translationKey of page.translationKeys) {
    addKey(translationKey)
  }

  // Dynamic keys (validation, table labels) keep en.json order within each prefix.
  for (const prefix of page.translationKeyPrefixes) {
    for (const translationKey of englishKeys) {
      if (
        translationKey === prefix ||
        translationKey.startsWith(`${prefix}.`)
      ) {
        addKey(translationKey)
      }
    }
  }

  return orderedKeys
}

export async function extractTemplateTranslationKeys({
  template,
  localeBase,
  englishTranslations,
  projectRoot
}) {
  const source = await buildUsageOrderedTemplateSource({
    template,
    projectRoot
  })
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

  const orderedMatches = [
    ...[...source.matchAll(/t\(locale,\s*['"]([^'"]+)['"]/g)].map((match) => ({
      index: match.index,
      keys: [match[1]]
    })),
    ...collectPageTranslationMatches({
      source,
      i18nAliases,
      englishTranslations,
      stringVariables
    })
  ].sort((left, right) => left.index - right.index)

  for (const { keys } of orderedMatches) {
    for (const translationKey of keys) {
      translationKeys.add(translationKey)
    }
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

async function buildUsageOrderedTemplateSource({
  template,
  projectRoot,
  visited = new Set()
}) {
  const chain = await loadExtendsChain(template, projectRoot, visited)

  if (chain.length === 0) {
    return ''
  }

  let expanded = chain.at(-1).source
  const childTopLevels = []

  for (let index = chain.length - 2; index >= 0; index -= 1) {
    const childSource = chain[index].source
    expanded = applyBlockOverrides(expanded, extractBlocks(childSource))
    childTopLevels.push(extractTopLevelTemplateContent(childSource))
  }

  // Block bodies keep macro calls, but `{% from %}` imports usually live
  // outside blocks — reattach them so call-site inlining can resolve macros.
  // Do not prepend `{% include %}` here; includes must stay in document order
  // (e.g. footer) or they pull those keys to the top of the workbook.
  const fromDirectives = chain
    .map(({ source }) => extractFromDirectives(source))
    .filter(Boolean)
    .join('\n')

  if (fromDirectives) {
    expanded = `${fromDirectives}\n${expanded}`
  }

  expanded = await inlineTemplateReferences(expanded, projectRoot, visited)

  // Insert child top-level sets after macros are inlined so component headings
  // from macro bodies appear before field labels defined in the child template.
  for (const childTopLevel of childTopLevels) {
    expanded = insertChildTopLevelContent(expanded, childTopLevel)
  }

  return expanded
}

async function loadExtendsChain(template, projectRoot, visited) {
  const chain = []
  let current = template

  while (current) {
    const filePath = await resolveTemplatePath(projectRoot, current)

    if (visited.has(filePath)) {
      break
    }

    visited.add(filePath)

    const source = await fs.readFile(filePath, 'utf8')
    chain.push({ filePath, source })

    const parent = source.match(/{%\s*extends\s+['"]([^'"]+)['"]/)?.[1]
    current = parent && !parent.startsWith('govuk/') ? parent : null
  }

  return chain
}

function extractBlocks(source) {
  const blocks = new Map()

  for (const block of findBlockRegions(source)) {
    blocks.set(block.name, block.body)
  }

  return blocks
}

function applyBlockOverrides(source, blocks) {
  const regions = findBlockRegions(source)

  if (regions.length === 0) {
    return source
  }

  let result = ''
  let cursor = 0

  for (const region of regions) {
    result += source.slice(cursor, region.start)
    result += blocks.has(region.name) ? blocks.get(region.name) : region.body
    cursor = region.end
  }

  result += source.slice(cursor)

  return result
}

function findBlockRegions(source) {
  const regions = []
  const openPattern = /{%\s*block\s+(\w+)\s*%}/g
  const tagPattern = /{%\s*(block\s+(\w+)|endblock)\s*%}/g

  for (const openMatch of source.matchAll(openPattern)) {
    const name = openMatch[1]
    const bodyStart = openMatch.index + openMatch[0].length
    let depth = 1
    tagPattern.lastIndex = bodyStart

    for (const tagMatch of source.matchAll(tagPattern)) {
      if (tagMatch.index < bodyStart) {
        continue
      }

      if (tagMatch[1].startsWith('block')) {
        depth += 1
        continue
      }

      depth -= 1

      if (depth === 0) {
        regions.push({
          name,
          body: source.slice(bodyStart, tagMatch.index),
          start: openMatch.index,
          end: tagMatch.index + tagMatch[0].length
        })
        break
      }
    }
  }

  // Keep only top-level regions so nested defaults stay inside parent bodies
  // until a child override replaces that nested block in a later pass.
  return regions.filter(
    (region) =>
      !regions.some(
        (other) =>
          other !== region &&
          other.start < region.start &&
          other.end > region.end
      )
  )
}

function extractFromDirectives(source) {
  return [...source.matchAll(/{%\s*from\s+['"][^'"]+['"]\s+import\s+[^%]+%}/g)]
    .map(([directive]) => directive)
    .join('\n')
}

function extractTopLevelTemplateContent(source) {
  let content = source
    .replace(/{%\s*extends\s+['"][^'"]+['"]\s*%}/g, '')
    .replace(/{%\s*from\s+['"][^'"]+['"]\s+import\s+[^%]+%}/g, '')
    .replace(/{%\s*include\s+['"][^'"]+['"]\s*%}/g, '')

  const regions = findBlockRegions(content)

  for (const region of [...regions].reverse()) {
    content = `${content.slice(0, region.start)}${content.slice(region.end)}`
  }

  return content.trim()
}

function insertChildTopLevelContent(source, content) {
  if (!content) {
    return source
  }

  const setPattern = /{%\s*set\s+(\w+)\s*=\s*([\s\S]*?)%}/g
  const sets = [...content.matchAll(setPattern)].map((match) => ({
    name: match[1],
    statement: match[0],
    value: match[2],
    hasTranslations: /\.ct\(|\.t\(|\bt\(\s*locale/.test(match[2])
  }))

  if (sets.length === 0) {
    return insertIntoContentBlock(source, content)
  }

  const remainingStatements = []
  const insertions = []

  for (const set of sets) {
    if (!set.hasTranslations) {
      remainingStatements.push(set.statement)
      continue
    }

    const insertAt = findMacroCallEndAfterUsage(source, set.name)

    if (insertAt === -1) {
      remainingStatements.push(set.statement)
      continue
    }

    // Insert each translation-bearing set after the call that uses it so
    // call-site argument keys (e.g. preHeader) stay before set-defined keys
    // (e.g. heading), and summary-list field keys stay with that component.
    insertions.push({ index: insertAt, text: set.statement })
  }

  insertions.sort((left, right) => right.index - left.index)

  let result = source

  for (const { index, text } of insertions) {
    result = `${result.slice(0, index)}\n${text}\n${result.slice(index)}`
  }

  if (remainingStatements.length > 0) {
    result = insertIntoContentBlock(result, remainingStatements.join('\n'))
  }

  const leftover = content
    .replace(/{%\s*set\s+\w+\s*=\s*[\s\S]*?%}/g, '')
    .trim()

  if (leftover) {
    result = insertIntoContentBlock(result, leftover)
  }

  return result
}

function findMacroCallEndAfterUsage(source, variableName) {
  const usagePattern = new RegExp(`\\b${escapeRegExp(variableName)}\\b`, 'g')

  for (const match of source.matchAll(usagePattern)) {
    const callStart = source.lastIndexOf('{{', match.index)

    if (callStart === -1 || callStart < match.index - 300) {
      continue
    }

    const argsStart = source.indexOf('(', callStart)

    if (argsStart === -1 || argsStart > match.index) {
      continue
    }

    const argsEnd = findMatchingParen(source, argsStart)

    if (argsEnd === -1) {
      continue
    }

    const callEnd = source.indexOf('}}', argsEnd)

    if (callEnd === -1) {
      continue
    }

    return callEnd + 2
  }

  return -1
}

function insertIntoContentBlock(source, content) {
  if (!content) {
    return source
  }

  const contentBlock = source.match(/{%\s*block\s+content\s*%}/)

  if (!contentBlock) {
    return `${content}\n${source}`
  }

  const insertAt = contentBlock.index + contentBlock[0].length

  return `${source.slice(0, insertAt)}\n${content}\n${source.slice(insertAt)}`
}

async function inlineTemplateReferences(source, projectRoot, visited) {
  let expanded = source
  const macroBodies = new Map()

  for (const match of source.matchAll(
    /{%\s*from\s+['"]([^'"]+)['"]\s+import\s+([^%]+)%}/g
  )) {
    const reference = match[1]
    const importNames = match[2]

    if (reference.startsWith('govuk/')) {
      continue
    }

    const filePath = await resolveTemplatePath(projectRoot, reference)

    if (visited.has(filePath)) {
      continue
    }

    visited.add(filePath)

    const macroSource = await inlineTemplateReferences(
      await fs.readFile(filePath, 'utf8'),
      projectRoot,
      visited
    )

    for (const name of parseImportNames(importNames)) {
      const body = extractMacroBody(macroSource, name)

      if (body) {
        macroBodies.set(name, body)
      }
    }
  }

  for (const reference of matchAll(
    source,
    /{%\s*include\s+['"]([^'"]+)['"]/g
  )) {
    if (reference.startsWith('govuk/')) {
      continue
    }

    const filePath = await resolveTemplatePath(projectRoot, reference)

    if (visited.has(filePath)) {
      continue
    }

    visited.add(filePath)

    const included = await inlineTemplateReferences(
      await fs.readFile(filePath, 'utf8'),
      projectRoot,
      visited
    )
    expanded = expanded.replace(
      new RegExp(
        `{%\\s*include\\s+['"]${escapeRegExp(reference)}['"]\\s*%}`,
        'g'
      ),
      included
    )
  }

  for (const [name, body] of macroBodies) {
    expanded = inlineMacroCalls(expanded, name, body)
  }

  return expanded
}

function parseImportNames(importClause) {
  return importClause
    .split(',')
    .map((part) =>
      part
        .trim()
        .split(/\s+as\s+/i)[0]
        .trim()
    )
    .filter(Boolean)
}

function extractMacroBody(source, macroName) {
  const pattern = new RegExp(
    `{%\\s*macro\\s+${escapeRegExp(macroName)}\\s*\\([^)]*\\)\\s*%}([\\s\\S]*?){%\\s*endmacro\\s*%}`
  )
  const match = source.match(pattern)

  return match?.[1] ?? null
}

function inlineMacroCalls(source, macroName, body) {
  let result = ''
  let cursor = 0
  const callPattern = new RegExp(
    `\\{\\{\\s*${escapeRegExp(macroName)}\\s*\\(`,
    'g'
  )

  for (const match of source.matchAll(callPattern)) {
    const argsStart = match.index + match[0].length
    const argsEnd = findMatchingParen(source, argsStart - 1)

    if (argsEnd === -1) {
      continue
    }

    const callEnd = source.indexOf('}}', argsEnd)

    if (callEnd === -1) {
      continue
    }

    // Keep the original call so argument translation keys stay discoverable,
    // and place the macro body first so component headings precede call-site
    // argument labels such as summary list rows.
    result += source.slice(cursor, match.index)
    result += `\n${body}\n`
    result += source.slice(match.index, callEnd + 2)
    cursor = callEnd + 2
  }

  result += source.slice(cursor)

  return result
}

function findMatchingParen(source, openIndex) {
  let depth = 0

  for (let index = openIndex; index < source.length; index += 1) {
    const character = source[index]

    if (character === '(') {
      depth += 1
      continue
    }

    if (character === ')') {
      depth -= 1

      if (depth === 0) {
        return index
      }
    }
  }

  return -1
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

function collectPageTranslationMatches({
  source,
  i18nAliases,
  englishTranslations,
  stringVariables
}) {
  const matches = []

  for (const [alias, base] of i18nAliases) {
    const escapedAlias = escapeRegExp(alias)

    for (const match of source.matchAll(
      new RegExp(`${escapedAlias}\\.t\\(\\s*['"]([^'"]+)['"]`, 'g')
    )) {
      matches.push({
        index: match.index,
        keys: [`${base}.${match[1]}`]
      })
    }

    for (const match of source.matchAll(
      new RegExp(
        `${escapedAlias}\\.ct\\(\\s*['"]([^'"]+)['"]\\s*,\\s*['"]([^'"]+)['"]`,
        'g'
      )
    )) {
      matches.push({
        index: match.index,
        keys: [
          resolveComponentTranslationKey(
            englishTranslations,
            base,
            match[1],
            match[2]
          )
        ]
      })
    }

    for (const match of source.matchAll(
      new RegExp(
        `${escapedAlias}\\.ct\\(\\s*['"]([^'"]+)['"]\\s*,\\s*([\\w.]+)`,
        'g'
      )
    )) {
      const key = stringVariables.get(match[2])

      if (key) {
        matches.push({
          index: match.index,
          keys: [
            resolveComponentTranslationKey(
              englishTranslations,
              base,
              match[1],
              key
            )
          ]
        })
        continue
      }

      // Runtime-selected component key (e.g. complianceStatus.straplineKey).
      // Include every string under that component at this call site.
      const componentKeys = listComponentTranslationKeys(
        englishTranslations,
        base,
        match[1]
      )

      if (componentKeys.length > 0) {
        matches.push({
          index: match.index,
          keys: componentKeys
        })
      }
    }

    for (const match of source.matchAll(
      new RegExp(
        `${escapedAlias}\\.ck\\(\\s*['"]([^'"]+)['"]\\s*,\\s*['"]([^'"]+)['"]`,
        'g'
      )
    )) {
      matches.push({
        index: match.index,
        keys: [
          resolveComponentTranslationKey(
            englishTranslations,
            base,
            match[1],
            match[2]
          )
        ]
      })
    }
  }

  return matches
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

function listComponentTranslationKeys(translations, pageLocaleBase, component) {
  const pageBase = `${pageLocaleBase}.components.${component}`
  const pageValue = getTranslationValue(translations, pageBase)

  if (isRecord(pageValue)) {
    return flattenTranslations(pageValue).map(({ key }) => `${pageBase}.${key}`)
  }

  const sharedBase = COMPLIANCE_COMPONENT_LOCALE[component]

  if (!sharedBase) {
    return []
  }

  const sharedValue = getTranslationValue(translations, sharedBase)

  if (!isRecord(sharedValue)) {
    return []
  }

  return flattenTranslations(sharedValue).map(
    ({ key }) => `${sharedBase}.${key}`
  )
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
