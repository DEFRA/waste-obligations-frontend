# Translation export and import plan

The translation workflow is driven by three files:

- `src/server/locales/en.json` is the source of truth for translation keys and English values.
- `src/server/locales/cy.json` stores Welsh translations.
- `scripts/translations/page-matrix.json` maps each page to route, template and translator metadata.

The translation tooling is a private npm package in `scripts/translations`. This
keeps workbook-only dependencies, such as ExcelJS, out of the root web app
dependency tree and built container.

Before running the tooling for the first time, or after
`scripts/translations/package-lock.json` changes, install its dependencies:

```bash
npm run translations:install
```

## Page matrix

Each entry in `page-matrix.json` represents a page workbook, for example:

```json
{
  "pages": {
    "producer-certificate-submit": {
      "fileName": "07-producer-certificate-submit.xlsx",
      "route": "/compliance/producer/{organisationId}/certificate/submit",
      "template": "compliance/producer/certificate-submit/index",
      "localeBase": "compliance.certificateSubmit",
      "figmaUrl": "https://www.figma.com/file/example",
      "notes": "Check and submit certificate page"
    }
  }
}
```

Use `figmaUrl` for the screen design link that translators should see for that page.

The export script scans the configured page template and shared templates it extends to find translation keys used on that page. Use `translationKeyPrefixes` for keys that are selected dynamically in server-side code, such as validation messages or table row status labels.

Each translation key is exported once. If a shared or generic component is rendered on more than one page, the first matching page in `page-matrix.json` owns that translation key. Later page workbooks omit that key and include a short translator note naming the workbook where the reusable content is translated.

During import, conflicting non-blank Welsh values for the same translation key will fail the import instead of silently choosing one value.

## Export process

Run:

```bash
npm run translations:export
```

By default this creates a directory of page workbooks in `translations/welsh-translations`.

To write to a different directory, pass `--output`:

```bash
npm run translations:export -- --output translations/custom-translations
```

The export script:

1. Add a translator notes section at the top of the workbook.
2. Create one workbook per page in `page-matrix.json`.
3. Derive translation keys from the page's route template and configured dynamic key prefixes.
4. Fail if any English translation value starts or ends with whitespace.
5. Skip translation keys already assigned to earlier page workbooks and add translator notes for reused content.
6. Leave the Welsh cell blank where the current Welsh value exactly matches the English value.
7. Apply the worksheet filter across the full generated translation range.
8. Include visible translator columns:
   - `English`
   - `Welsh`
   - `Figma link`
9. Include hidden internal columns:
   - `Translation key`
   - `Parent key`
   - `Section`
10. Pre-fill Welsh values from `cy.json` where they already exist and do not match the English value.

## Import process

Run:

```bash
npm run translations:import
```

By default this reads every `.xlsx` file in `translations/welsh-translations` and writes `src/server/locales/cy.json`.

To read from a different workbook or directory, or write to a different output file, pass `--input` or `--output`:

```bash
npm run translations:import -- --input translations/custom-translations --output src/server/locales/cy.json
```

The import script:

1. Read translated values from the workbook or workbooks.
2. Use the hidden `Translation key` column to write values back into `src/server/locales/cy.json`.
3. Preserve existing Welsh values when the workbook cell is blank.
4. Preserve the nested JSON shape from `en.json`.
5. Fail if required hidden columns are missing, duplicate keys have conflicting translated values, or an imported Welsh value is missing a placeholder such as `{{year}}` from the English source string. HTML-encoded placeholder braces are decoded before this check.

## Tests and audit

Run translation-tooling tests from the root package:

```bash
npm run test:translations
```

Audit the isolated translation-tooling dependency tree directly:

```bash
npm --prefix scripts/translations run audit
```
