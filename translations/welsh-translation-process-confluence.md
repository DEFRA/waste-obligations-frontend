# Welsh translation process for page content

This page explains the high-level process for exporting page copy for Welsh
translation, sending translator workbooks for review, and importing the returned
translations.

The waste obligations app is a child app of
[`epr-packaging-frontend`](https://github.com/DEFRA/epr-packaging-frontend).
Both repos have similar page-workbook processes, but they use different source
formats:

- [`waste-obligations-frontend`](https://github.com/DEFRA/waste-obligations-frontend)
  uses JSON locale files and a private npm translation package.
- [`epr-packaging-frontend`](https://github.com/DEFRA/epr-packaging-frontend)
  uses RESX resource files and a .NET translation CLI.

Do not write Welsh translations manually. Only import returned translator
workbooks, or copy Welsh text from an approved source when the English source
string and UI placement match.

## Source of truth

For `waste-obligations-frontend`, English copy comes from
[`src/server/locales/en.json`](https://github.com/DEFRA/waste-obligations-frontend/blob/main/src/server/locales/en.json).
Welsh copy is written to
[`src/server/locales/cy.json`](https://github.com/DEFRA/waste-obligations-frontend/blob/main/src/server/locales/cy.json).
The page matrix is
[`scripts/translations/page-matrix.json`](https://github.com/DEFRA/waste-obligations-frontend/blob/main/scripts/translations/page-matrix.json).
The detailed tool guide is
[`scripts/translations/README.md`](https://github.com/DEFRA/waste-obligations-frontend/blob/main/scripts/translations/README.md).

For `epr-packaging-frontend`, English and Welsh copy live in RESX files under
`src/FrontendSchemeRegistration.UI/Resources`. The profile files under
[`tools/translations/profiles`](https://github.com/DEFRA/epr-packaging-frontend/tree/main/tools/translations/profiles)
act as the page matrix. The current CSoC profile is
[`tools/translations/profiles/csoc.json`](https://github.com/DEFRA/epr-packaging-frontend/blob/main/tools/translations/profiles/csoc.json).
The detailed tool guide is
[`tools/translations/README.md`](https://github.com/DEFRA/epr-packaging-frontend/blob/main/tools/translations/README.md).

## Keep the page matrix current

Review the page matrix/profile whenever a route, template, Razor view, partial,
RESX file, locale base, or user-facing page changes.

Each page entry should identify:

- the route or short process label;
- the template or Razor view;
- the locale base, resource files, keys or key prefixes that belong to the page;
- notes that help translators understand the page context;
- the Figma URL for the page.

### Figma URLs

Set the Figma URL for each page matrix/profile entry before exporting workbooks.
Use the exact Figma frame, prototype or design link for the page being
translated, not a general project or file link. The exporter writes this value
into the visible `Figma link` column in the workbook, so translators can see the
layout, nearby content and component context.

In `waste-obligations-frontend`, set:

```json
"figmaUrl": "https://www.figma.com/..."
```

Leave it as an empty string only when the design URL is not available yet.

In `epr-packaging-frontend`, set:

```json
"figmaUrl": "https://www.figma.com/..."
```

Leave it as `null` only when the design URL is not available yet.

## Export translator workbooks

For `waste-obligations-frontend`, run from the repo root:

```bash
npm run translations:install
npm run translations:export
npm run test:translations
```

The export writes `.xlsx` files to
[`translations/welsh-translations/xlsx`](https://github.com/DEFRA/waste-obligations-frontend/tree/main/translations/welsh-translations/xlsx)
and review JSON sidecars to
[`translations/welsh-translations/json`](https://github.com/DEFRA/waste-obligations-frontend/tree/main/translations/welsh-translations/json).

For `epr-packaging-frontend`, run from the repo root:

```bash
dotnet run --project tools/translations/cli/cli.csproj -- export --profile csoc
dotnet test tools/translations/translations.slnx
```

The CSoC export writes `.xlsx` files to
[`translations/welsh-translations/csoc/xlsx`](https://github.com/DEFRA/epr-packaging-frontend/tree/main/translations/welsh-translations/csoc/xlsx)
and review JSON sidecars to
[`translations/welsh-translations/csoc/json`](https://github.com/DEFRA/epr-packaging-frontend/tree/main/translations/welsh-translations/csoc/json).

Shared content is exported only once. If a later page only reuses rows already
owned by an earlier workbook, the exporter skips the empty workbook and records
the reusable-content ownership in translator notes.

## Current workbook attachments

Attach the current workbook zips when sending the page copy for translation:

- Waste obligations page workbooks:
  [`translations/welsh-translations/waste-obligations-welsh-translations-xlsx.zip`](https://github.com/DEFRA/waste-obligations-frontend/blob/main/translations/welsh-translations/waste-obligations-welsh-translations-xlsx.zip)
- Parent app CSoC workbooks:
  [`translations/welsh-translations/csoc/epr-packaging-csoc-welsh-translations-xlsx.zip`](https://github.com/DEFRA/epr-packaging-frontend/blob/main/translations/welsh-translations/csoc/epr-packaging-csoc-welsh-translations-xlsx.zip)

The JSON sidecars are for GitHub review. The `.xlsx` files are the files to send
to translators.

## Import returned translations

For `waste-obligations-frontend`, put the returned workbook files in the export
folder and run:

```bash
npm run translations:import
npm run test:translations
```

For `epr-packaging-frontend`, put the returned CSoC workbook files in the CSoC
export folder and run:

```bash
dotnet run --project tools/translations/cli/cli.csproj -- import --profile csoc
dotnet test tools/translations/translations.slnx
```

The import steps preserve existing Welsh values when translator cells are blank.
They also validate hidden translation keys, duplicate/conflicting translations,
placeholders and formatting-sensitive content.

## Footnote

A similar export/import process is expected for email content. Detail will be
added once the email process is defined.
