# Repository guidance

## Translations

The translation export and import workflow is documented in
[`scripts/translations/README.md`](scripts/translations/README.md).

Use `src/server/locales/en.json` as the source of truth for translation keys
and English copy. Keep `scripts/translations/page-matrix.json` aligned with the
current `en.json` structure before exporting translator workbooks.
