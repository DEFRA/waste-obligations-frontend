import fs from 'node:fs/promises'

export async function readJsonFile (filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'))
}

export async function writeJsonFile (filePath, value) {
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`)
}

export function flattenTranslations (translations, path = []) {
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

export function getTranslationValue (translations, key) {
  return key.split('.').reduce((current, part) => {
    if (!isRecord(current)) {
      return undefined
    }

    return current[part]
  }, translations)
}

export function setTranslationValue (translations, key, value) {
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

export function findParentKey (translationKey, pageMatrix) {
  const parts = translationKey.split('.')

  for (let index = parts.length - 1; index > 0; index--) {
    const parentKey = parts.slice(0, index).join('.')

    if (pageMatrix[parentKey]) {
      return parentKey
    }
  }
}

export function buildWelshTranslations ({ englishTranslations, currentWelshTranslations, translatedRows }) {
  const nextWelshTranslations = structuredClone(englishTranslations)

  for (const { key } of flattenTranslations(englishTranslations)) {
    const currentWelshValue = getTranslationValue(currentWelshTranslations, key)

    if (typeof currentWelshValue === 'string') {
      setTranslationValue(nextWelshTranslations, key, currentWelshValue)
    }
  }

  for (const row of translatedRows) {
    const englishValue = getTranslationValue(englishTranslations, row.translationKey)

    if (typeof englishValue !== 'string') {
      throw new Error(`Translation key "${row.translationKey}" does not exist in en.json`)
    }

    if (row.welsh) {
      setTranslationValue(nextWelshTranslations, row.translationKey, row.welsh)
    }
  }

  return nextWelshTranslations
}

export function buildTranslationRows ({ englishTranslations, welshTranslations, pageMatrix }) {
  return flattenTranslations(englishTranslations)
    .map((translation) => {
      const welshValue = getTranslationValue(welshTranslations, translation.key)
      const welsh = typeof welshValue === 'string' && welshValue !== translation.value
        ? welshValue
        : ''
      const parentKey = findParentKey(translation.key, pageMatrix)

      if (!parentKey) {
        throw new Error(`No page matrix entry found for translation key "${translation.key}"`)
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

function isRecord (value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
