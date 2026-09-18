# Repository guidance

## Path-based reverse proxying

This service can be hosted directly or beneath a trusted reverse-proxy path.
The proxy removes the external path before forwarding it and supplies a single
validated `X-Forwarded-Prefix` header. Details of the deployment contract are
in [`README.md`](README.md#path-based-reverse-proxying).

When changing browser-facing behaviour:

- Build an in-service link or view-model URL with
  `withForwardedPrefix(request, localPath)` from
  `src/server/common/helpers/proxy/forwarded-prefix.js`. Do not add the prefix
  to configured absolute URLs for other services.
- Do not put a literal root-relative service link such as `href="/cookies"` in
  a Nunjucks template. Pass a prefix-aware URL through the view model or
  Nunjucks context. The template policy test enforces this.
- Keep ordinary local `h.redirect()` targets as application-local paths. The
  `forwarded-prefix-redirects` plugin prefixes every local redirect once, while
  leaving absolute redirect URLs unchanged.
- Use `getAssetPath()` for rendered assets. It already produces a
  prefix-aware browser URL.
- All Hapi cookie definitions are scoped to the forwarded prefix by the
  server's state contextualiser. Do not set a fixed root cookie path for a new
  browser cookie.
- The Azure AD B2C callback must be registered with the external prefix, for
  example `/manage-recycling-obligations/signin-oidc`.

For a new or changed local link, add a test with
`X-Forwarded-Prefix`. Use
`getNonPrefixedServiceLinkHrefs()` from
`test-helpers/proxy-link-assertions.js` in rendered-page tests where practical.
`src/server/common/helpers/proxy/service-link-policy.test.js` rejects new
hard-coded root-relative Nunjucks links.

Integration journeys run through the direct app and, in Docker CI, through the
path-routing proxy. Keep one shared Playwright suite: add a journey once and
let the `direct` and `reverse-proxy` projects run it. Do not add separate
proxy-only copies of journey specs. The proxy service and its public path are
defined in `compose.integration.yml`; `test:integration:docker` enables both
projects.

## SonarCloud

The SonarCloud project is
[`DEFRA_waste-obligations-frontend`](https://sonarcloud.io/project/overview?id=DEFRA_waste-obligations-frontend).
Use this project, and the relevant pull-request analysis, to determine the
quality-profile rules and quality-gate requirements that apply to a change.

SonarCloud requires at least 90% coverage on new code. Add or extend tests for
new lines and conditions, and run `npm test` to generate the coverage report
before handing off a change.

## Application logging and data protection

The CDP Node frontend template owns the baseline Hapi/Pino/ECS logging setup.
Do not change or duplicate that template behaviour for application logging
changes. This application additionally uses `LOG_REDACT` for known structured
paths, but redaction does not affect values interpolated into message strings
or raw error objects.

When adding or changing application log messages:

- Do not log citizen or company personal data, including names, email
  addresses, addresses, telephone numbers, credentials, form data, query
  values that contain free text, request headers, referrers, or provider error
  descriptions. Opaque operational identifiers such as user, organisation,
  scheme and declaration IDs may be logged.
- Use `logApplicationError()` from
  `src/server/common/helpers/logging/application-error.js` for application
  errors. It preserves the raw error for local development and test diagnosis,
  but emits only the supplied safe message when `isProduction` is true.
- Keep deployed log messages to a fixed safe message plus approved operational
  identifiers. Do not interpolate an error message or untrusted data into a
  deployed log message.
- Add tests that cover both local and production behaviour when introducing a
  new logging helper or error-logging path.

## Translations

The translation export and import workflow is documented in
[`scripts/translations/README.md`](scripts/translations/README.md).

Translation tooling is a private npm package under `scripts/translations`.
Workbook-only dependencies, such as ExcelJS, belong there rather than in the
root web app `package.json`, because the tooling is local-only and is not run in
the built container. If the translation package dependencies are missing, run
`npm run translations:install`.

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
- `figmaUrl` to the exact Figma frame, prototype or design link for that page
  when one is known. Leave it blank only when the design URL is not yet
  available, because the exporter includes this link in the translator workbook.

Each translation key must appear in only one generated workbook. Page-matrix
order controls ownership: put shared/generic entries before pages that reuse
them. If a later page renders content translated in an earlier workbook, the
exporter omits those rows from the later workbook and adds a short translator
note naming the workbook that owns the reusable content. Within each workbook,
rows are ordered by on-page usage so translators can follow the content from
top to bottom.

To regenerate translator workbooks, run
`npm run translations:export`. By default it writes one `.xlsx` file per page to
`translations/welsh-translations/xlsx/` and matching review JSON files to
`translations/welsh-translations/json/`.

After page-matrix changes, verify the workflow with:

```bash
npm run translations:install
npm run translations:export -- --output /tmp/waste-obligations-page-translations
npm run translations:import -- --input /tmp/waste-obligations-page-translations --output /tmp/waste-obligations-cy-import.json
npm run test:translations
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

## Waste Obligations journey tests

The shared suite lives in
[DEFRA/waste-obligations-journey-tests](https://github.com/DEFRA/waste-obligations-journey-tests).
Read its [run instructions](https://github.com/DEFRA/waste-obligations-journey-tests/blob/main/README.md)
and [agent guidance](https://github.com/DEFRA/waste-obligations-journey-tests/blob/main/AGENTS.md)
when changing behavior used by the journey.

The backend, Waste Obligations frontend and packaging proxy PR workflows use
the [shared action](https://github.com/DEFRA/waste-obligations-journey-tests/blob/main/run-journey-tests/action.yml)
to run E2E, accessibility and passive security profiles against a CDP-only
Docker stack. Browser traffic enters through the packaging proxy; Azure
application navigation is omitted, but the remaining scenario must run.
Azure AD B2C login is still required. After CDP service deployment to dev,
the deployed suite exercises the full Azure-to-CDP journey. Passing the Docker
checks does not prove that deployed Azure navigation or configuration works.

### Coordinating application and journey changes

1. For every application behavior change, assess the shared journey coverage.
   Add or amend scenarios and assertions alongside the application change when
   user-visible behavior, API contracts, authentication, routing or error paths
   change. Record why no journey update is needed when existing coverage suffices.
2. When coordinating changes, create and push the **exact same branch name**
   in `waste-obligations-journey-tests` and every affected application repository
   (`waste-obligations`, `waste-obligations-frontend`, `packaging-waste-proxy`).
   For example, use `MO-123-description` in each changed repository. A local-only
   branch is not visible to CI; do not create empty companion branches where
   no changes are needed.
3. Push companion changes before the validation run. Service PR workflows select
   the matching journey branch, falling back to `main` when absent, and pin the
   calling service to its PR head SHA. For other services, explicit revisions
   take precedence over matching branches; absent both, the action uses published
   images and `main` setup assets where applicable. Check the resolved revisions
   in the run logs: a green fallback run does not validate unpublished changes.
4. A push to a companion repository does not automatically rerun an existing
   service PR check. After all companion changes are pushed, rerun the affected
   service journey jobs (or trigger new runs). Recheck the resolved revisions
   after further companion changes and before merging.
5. Update scenario data and service-owned dependency contracts together with
   assertions. For environment variables and feature flags, follow the
   environment-change checklist below: check CI injection, runner settings and
   deployed service configuration separately. Exercise the applicable Docker
   profiles and the full deployed journey when its environment is available;
   do not skip whole scenarios to conceal missing coverage or configuration.
6. Link companion PRs in each PR description. Record the tested service/test
   revisions, execution mode, results and required configuration changes.
   Describe merge and deployment dependencies explicitly. Keep intermediate
   states compatible, or agree a coordinated rollout before merging; do not
   assume repositories deploy atomically.
7. Matching branches coordinate **PR checks only**. Deployed CDP runs use a
   published journey-test image, not the matching source branch. Before relying
   on post-deployment regression coverage, verify the required journey changes
   are merged, their image is published and the deployed run selects that image.
   Coordinate application deployment, journey-image availability and required
   CDP/Azure configuration; confirm the resulting dev run and its image version.

### Environment and contract changes

For every added, renamed, removed or changed environment variable, feature
flag, default, credential, endpoint or dependency used by this journey:

1. Trace where the service reads the setting and which journey behavior it
   controls. Check the service examples/defaults and deployment configuration.
2. Check the journey repository's
   [CI Compose stack](https://github.com/DEFRA/waste-obligations-journey-tests/blob/main/ci/compose.yml),
   action inputs/environment and caller workflow. Add or amend the value where
   the target service actually receives it; a variable set only on the test
   runner does not configure another container. Update the journey `.env.example`
   only for settings consumed by the runner or required local setup.
3. Review service-owned Compose fragments, WireMock contracts, infrastructure
   initialisers and scenario seed data. Keep service dependency setup with its
   owning service, and shared orchestration/scenario data in the journey repo.
4. Check the deployed CDP and Azure configuration separately. Document required
   flag/secret changes and their owner; Docker values do not propagate there.
   Keep real credentials out of source control and logs.
5. Coordinate repository revisions when contracts change. The three CI callers
   select a matching journey branch or fall back to main; the action resolves
   explicit backend/frontend/proxy revisions, then matching branches, then
   published images with main setup assets. Verify the selected revisions
   contain all required changes before relying on a run.
6. Run the affected Docker journey profiles and the deployed journey where its
   behavior changes and the environment is available. Record mode, revision,
   pass/fail/skip counts and blockers. Explain in the change description which
   journey setup was updated, or why no journey configuration change is needed.
   Do not hide a configuration mismatch by skipping a whole scenario.

This repository owns [compose/journey-tests.compose.yml](compose/journey-tests.compose.yml)
and its Account authentication/organisation WireMock contracts. Review
`FEATURE_SHOW_PRNS`, downstream API authentication, B2C callback configuration,
cookies and forwarded-prefix handling when relevant. The shared Docker journey
uses `/manage-recycling-obligations/`. These cross-service checks complement
this repository's own direct/reverse-proxy integration projects.
