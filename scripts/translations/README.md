# Translation export and import plan

The translation workflow is driven by three files:

- `src/server/locales/en.json` is the source of truth for translation keys and English values.
- `src/server/locales/cy.json` stores Welsh translations.
- `scripts/translations/page-matrix.json` maps each parent translation node to metadata for translators.

## Parent node matrix

Each entry in `page-matrix.json` uses a parent translation key, for example:

```json
{
  "compliance.certificateSubmit": {
    "figmaUrl": "https://www.figma.com/file/example",
    "generic": false,
    "notes": "Check and submit certificate page"
  }
}
```

Use `figmaUrl` for the screen design link that translators should see. Set `generic` to `true` for reusable content that does not belong to a single screen.

## Export process

Run:

```bash
npm run translations:export
```

By default this creates `translations/welsh-translations.xlsx`.

To write to a different path, pass `--output`:

```bash
npm run translations:export -- --output translations/custom-file.xlsx
```

The export script:

1. Add a translator notes section at the top of the workbook.
2. Flatten string values from `en.json` into individual rows.
3. Derive each row's parent key from the nearest matching key in `page-matrix.json`.
4. Leave the Welsh cell blank where the current Welsh value exactly matches the English value.
5. Include visible translator columns:
   - `English`
   - `Welsh`
   - `Figma link`
6. Include hidden internal columns:
   - `Translation key`
   - `Parent key`
   - `Section`
7. Pre-fill Welsh values from `cy.json` where they already exist and do not match the English value.

## Import process

Run:

```bash
npm run translations:import
```

By default this reads `translations/welsh-translations.xlsx` and writes `src/server/locales/cy.json`.

To read or write a different path, pass `--input` or `--output`:

```bash
npm run translations:import -- --input translations/custom-file.xlsx --output src/server/locales/cy.json
```

The import script:

1. Read translated values from the workbook.
2. Use the hidden `Translation key` column to write values back into `src/server/locales/cy.json`.
3. Preserve existing Welsh values when the workbook cell is blank.
4. Preserve the nested JSON shape from `en.json`.
5. Fail if required hidden columns are missing.
