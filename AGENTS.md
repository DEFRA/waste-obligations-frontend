# Repository guidance

## Translations

The translation export and import workflow is documented in
[`scripts/translations/README.md`](scripts/translations/README.md).

Use `src/server/locales/en.json` as the source of truth for translation keys
and English copy. `scripts/translations/page-matrix.json` is a page matrix: it
maps each exported workbook to a route, Nunjucks template, locale base, notes and
optional Figma URL.

When routes or templates change, scan for user-facing GET pages under
`src/server/routes/**`. Add or update a `pages` entry in
`scripts/translations/page-matrix.json` for each page-level workbook. Set:

- `route` to the Hapi route path or a short process label for non-route pages.
- `template` to the rendered Nunjucks template, without the `.njk` suffix.
- `localeBase` to the page's `pageI18n` base when the page uses one.
- `translationKeyPrefixes` for dynamic keys that are chosen in JavaScript rather
  than directly visible in the template, such as validation errors, status text
  and table row labels.
- `figmaUrl` to the page design link when one is known.

Each translation key must appear in only one generated workbook. Page-matrix
order controls ownership: put shared/generic entries before pages that reuse
them. If a later page renders content translated in an earlier workbook, the
exporter omits those rows from the later workbook and adds a short translator
note naming the workbook that owns the reusable content.

To regenerate translator workbooks, run
`npm run translations:export`. By default it writes one `.xlsx` file per page to
`translations/welsh-translations/`.

After page-matrix changes, verify the workflow with:

```bash
npm run translations:export -- --output /tmp/waste-obligations-page-translations
npm run translations:import -- --input /tmp/waste-obligations-page-translations --output /tmp/waste-obligations-cy-import.json
npx vitest run scripts/translations
```

To check that every English key is assigned to at least one page workbook, run:

```bash
node --input-type=module -e "import { buildPageTranslationGroups, flattenTranslations, readJsonFile } from './scripts/translations/translation-utils.js'; const englishTranslations = await readJsonFile('src/server/locales/en.json'); const welshTranslations = await readJsonFile('src/server/locales/cy.json'); const pageMatrix = await readJsonFile('scripts/translations/page-matrix.json'); const groups = await buildPageTranslationGroups({ englishTranslations, welshTranslations, pageMatrix, projectRoot: process.cwd() }); const totalRows = groups.reduce((sum, group) => sum + group.rows.length, 0); const all = new Set(groups.flatMap((group) => group.rows.map((row) => row.translationKey))); const en = flattenTranslations(englishTranslations).map((row) => row.key); const missing = en.filter((key) => !all.has(key)); const extras = [...all].filter((key) => !en.includes(key)); console.log(JSON.stringify({ workbooks: groups.length, totalRows, uniqueTranslationKeys: all.size, duplicateRows: totalRows - all.size, englishTranslationKeys: en.length, missing, extras }, null, 2));"
```

Do not create Welsh translations yourself. Only copy Welsh text from an
approved source when the English source string and UI placement match.

This app is a child web app of `epr-packaging-frontend`, which should be in a
folder adjacent to this repo. Header and footer content is shared with that
parent app, so check its existing Welsh resources for matching header and footer
translations before leaving those child-app strings untranslated.
