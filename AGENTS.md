# Repository guidance

## Translations

The translation export and import workflow is documented in
[`scripts/translations/README.md`](scripts/translations/README.md).

Use `src/server/locales/en.json` as the source of truth for translation keys
and English copy. Keep `scripts/translations/page-matrix.json` aligned with the
current `en.json` structure before exporting translator workbooks.

Do not create Welsh translations yourself. Only copy Welsh text from an
approved source when the English source string and UI placement match.

This app is a child web app of `epr-packaging-frontend`, which should be in a
folder adjacent to this repo. Header and footer content is shared with that
parent app, so check its existing Welsh resources for matching header and footer
translations before leaving those child-app strings untranslated.
