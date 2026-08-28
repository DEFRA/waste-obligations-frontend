# `en.json` render-order review

**File:** `src/server/locales/en.json`
**Date:** 2026-08-28

## What was checked

Every key/value pair in `src/server/locales/en.json` was traced to the template
(`*.njk`) or view-model builder (`*.js`) that renders it, and the key order in
each object was compared against the order in which a user encounters those
strings on the page.

"Render order" = template-inheritance order (page chrome first: header → phase
banner → language switcher → back link → content → footer), then top-to-bottom
within the content block, descending into included macros at their point of use.
Where a key is used on several pages, it is placed by first appearance following
the user journey (about → submit → success → view).

Keys with no render position (thrown `Boom` error messages, lookup tables, and
keys not referenced anywhere) are noted per section.

The reordering is **cosmetic only** – `translate()` does a keyed lookup, so
order does not affect behaviour. All 288 leaf values are unchanged; i18n tests
pass.

---

## `errorPages`  — already in render order ✅

| Current | Render order |
|---|---|
| `400` → pageTitle | `400` |
| `401` → pageTitle | `401` |
| `403` → pageTitle, heading, body1{prefix, suffix} | `403` |
| `404` → pageTitle, heading, body1, body2, body3{prefix} | `404` |
| `500` → pageTitle, heading, body1, body2{prefix, suffix} | `500` |
| `default` → pageTitle | `default` |

Status codes match both numeric order and `errorPageKeys` in
`common/helpers/errors.js`; each nested object already matches `error/index.njk`.
No change.

---

## `auth`  — already in render order ✅

| Current | Render order |
|---|---|
| `signInFailed` → heading, noCredentials, noUserId, userNotFound, invalidService, accountServiceError | same |
| `signedOut` → pageTitle, heading, message | same |

`signInFailed` message keys match the failure order in
`routes/auth/sign-in-oidc.js` (`handleB2cCallbackError` → no user id →
`validateSignInEligibility` → account service error). No change.

---

## `common`  — reordered

### `common` (direct children)

| # | Current | Render order (updated) |
|---|---|---|
| 1 | serviceName | serviceName |
| 2 | warningIconFallback | **nav** |
| 3 | regulation43Text | **phaseBanner** |
| 4 | continue | **languageSwitcher** |
| 5 | opensInNewTab | regulation43Text |
| 6 | errorSummary | opensInNewTab |
| 7 | nav | warningIconFallback |
| 8 | phaseBanner | continue |
| 9 | languageSwitcher | errorSummary |
| 10 | footer | footer |

`serviceName` renders in the header; `nav` / `phaseBanner` / `languageSwitcher`
render in the header + `beforeContent` block of `layouts/page.njk`, i.e. before
any page content. The scalars `regulation43Text`, `opensInNewTab`,
`warningIconFallback`, `continue` and `errorSummary.title` are all
content-block strings and now follow, ordered by first journey appearance
(statement "about" page: reg-43 link → warning → continue; then submit page:
error summary).

### `common.nav`

| Current | Render order (updated) |
|---|---|
| home | home |
| back | manageAccount |
| menu | signOut |
| menuLabel | signIn |
| manageAccount | menu |
| signIn | menuLabel |
| signOut | back |

`build-navigation.js` renders `home, manageAccount, signOut` (authenticated) or
`signIn` (anonymous); `govukHeader` then renders the mobile-menu button
(`menu`, `menuLabel`); `back` renders later in `beforeContent`.

### `common.phaseBanner`

| Current | Render order (updated) |
|---|---|
| tag | lead |
| label | feedbackLink |
| lead | leadAfterLink |
| feedbackLink | tag |
| leadAfterLink | label |

In `layouts/page.njk` the `phaseHtml` set-block (`lead`, `feedbackLink`,
`leadAfterLink`) is evaluated before `govukPhaseBanner(...)` is called with
`tag` and `label`.

### `common.languageSwitcher`  — already correct ✅
`label, english, welsh` matches `beforeContent`.

### `common.errorSummary`  — single key, no change.

### `common.footer`  — already in render order ✅
`getHelp → email → telephone → openingTime → supportLinks → cookies → privacy →
accessibility → allContent → openGovernmentLicence → exceptWhere →
crownCopyright` matches `partials/epr-footer.njk` exactly.

---

## `cookies`  — reordered (one object)

Top-level children (`pageTitle, heading, introParagraph, introParagraph2,
essentialCookiesHeading, essentialCookiesDescription, table, session, csrf,
oauthState`) already match `cookies/index.njk` + `cookies/controller.js`. ✅

### `cookies.table`

| Current | Render order (updated) |
|---|---|
| name | essentialCookiesWeUse |
| purpose | name |
| expires | purpose |
| essentialCookiesWeUse | expires |

`buildCookieTable()` sets `caption: essentialCookiesWeUse` before the
`head: [name, purpose, expires]` array.

`session.purpose → csrf.purpose → oauthState.purpose → oauthState.expires`
already matches the table body rows. ✅

---

## `compliance`  — reordered

### `compliance` (direct children)

| Current | Render order (updated) |
|---|---|
| regulators | regulators |
| certificate | certificate |
| certificateSubmit | certificateSubmit |
| statement | **certificateSuccess** |
| statementSubmit | **certificateView** |
| statementSuccess | statement |
| certificateView | statementSubmit |
| statementView | statementSuccess |
| certificateSuccess | statementView |
| components | components |
| errors | errors |
| validation | validation |

Grouped by journey: producer certificate flow
(`certificate → certificateSubmit → certificateSuccess → certificateView`) then
CSO statement flow (`statement → statementSubmit → statementSuccess →
statementView`). `regulators` is a country-code lookup table (kept first);
`components` is the shared component bucket; `errors`/`validation` are
non-visual.

### `compliance.regulators`  — no change
Lookup keyed by business-country code (`GB-ENG` is the default). No render order.

### `compliance.certificate` / `compliance.certificateSubmit` / `compliance.certificateSuccess` / `compliance.certificateView`  — already in render order ✅
- `certificate` → single key `heading`.
- `certificateSubmit` → `pageTitle, heading` (`pageTitle` = `<title>`, rendered before the `<h1>`).
- `certificateSuccess` → `pageTitle, panelTitle, components.success.confirmationEmail`.
- `certificateView` → `heading` then `components` (`overallStatus{overallMet, overallNotMet}` → `obligationsTable.obligationStatus{met, notMet, noDataYet}` → `page{preHeader, verifiedByPrefix, downloadPdfButton, returnButton}`), all matching `certificate-view/index.njk`.

### `compliance.statement`  — already in render order ✅
`heading` then `components.about` (`description1, mustBullet1, mustBullet2,
howToTitle, howToDescription, regulatorContact, alreadySubmittedLead`) — matches
the page-specific overrides encountered top-to-bottom in `compliance-about.njk`
+ `cso/statement/index.njk`.

### `compliance.statementSubmit`

Direct children `pageTitle, heading, components` — correct. Within `components`:

| Current | Render order (updated) |
|---|---|
| regulatorInset | regulatorInset |
| obligationsTable | obligationsTable |
| declaration | **regulation43** |
| regulation43 | **declaration** |

In `cso/statement-submit/index.njk` `submitFormSection`, the Regulation 43
radios (`regulation43{heading, legendPrefix, legendSuffix, yes, no}`) render
before the declaration block (`declaration{intro, bullet1, fullNameLabel}`).
Nested order inside `regulation43` and `declaration` is already correct.

### `compliance.statementSuccess`  — already in render order ✅
`pageTitle, panelTitle, components.success{confirmationEmail, regulatorBullet2,
resubmitLead}` — the three page-specific overrides in journey order.

### `compliance.statementView`  — already in render order ✅
`heading → components`:
`complianceStatus{heading, obligationsMetCompliedStrapline,
notCompliantReg43Strapline, …4 subtexts}` →
`obligationsTable{tonnesNote, obligationStatus{…}}` →
`page{preHeader, verifiedByPrefix, downloadPdfButton, returnButton}`.
Strapline keys precede subtext keys (strapline in the status box, subtext
below); the 4 subtexts follow the scenario order in
`statement-compliance-status.js` (metComplied, metNotComplied, notMetComplied,
notMetNotComplied).

### `compliance.components`

| Current | Render order (updated) |
|---|---|
| summaryList | **about** |
| regulatorInset | regulatorInset |
| overallStatus | summaryList |
| obligationsTable | overallStatus |
| declaration | obligationsTable |
| success | declaration |
| about | success |

`about` is the shared fallback bucket for the "about" page, which is the first
page in the compliance journey. The remaining order follows the submit page
(`regulator-inset` → `summary-list` → `obligations-tables` → `declaration`),
with `overallStatus` inserted where it renders on the view pages (between the
summary list and the obligations table) and `success` last.
*(Note: the code constant `COMPLIANCE_COMPONENT_LOCALE` in `helpers/i18n/translate.js`
lists these in the old order — worth aligning it if this ordering is adopted.)*

#### `compliance.components.summaryList`

| Current | Render order (updated) |
|---|---|
| heading | heading |
| organisationName | organisationName |
| organisationId | **complianceScheme** |
| complianceScheme | **schemeOperator** |
| schemeOperator | **organisationId** |
| address | address |
| nameOnAccount | nameOnAccount |
| regulator | **submissionDate** |
| submissionDate | **regulator** |

Combined row order across the four summary-list pages:
`heading` (visually-hidden), then `organisationName` **or**
`complianceScheme` + `schemeOperator` (first row, producer vs CSO), then
`organisationId, address, nameOnAccount`, then `submissionDate` (view pages
only), then `regulator` (always last row).

#### `compliance.components.obligationsTable`

| Current | Render order (updated) |
|---|---|
| recyclingObligationsHeading | recyclingObligationsHeading |
| tonnesNote | tonnesNote |
| glassHeading | tableMaterial |
| tableMaterial | tableObligationToMeet |
| tableObligationToMeet | tableAwaiting |
| tableAwaiting | tableAccepted |
| tableAccepted | tableOutstanding |
| tableOutstanding | tableStatus |
| tableStatus | **material** |
| notAvailableYet | **notAvailableYet** |
| material | **obligationStatus** |
| table | table |
| obligationStatus | **glassHeading** |

`obligations-tables/macro.njk` + `certificate-obligations-table/macro.njk` +
`build-table-rows.js`: heading → tonnes note → 6 column headers → row cells
(`material.*` in column 1, `notAvailableYet` in the numeric columns,
`obligationStatus.*` in the status column) → `table.totalsRow`, and only then
the **glass** sub-table heading. Nested `material`
(`paperComposite, plastic, wood, steel, aluminium, glass, glassRemelt,
glassRemaining, other, default`) already matches `MATERIAL_SORT_KEY` in
`obligation-presenter.js`; `obligationStatus{met, notMet, noDataYet}` correct.

#### `compliance.components.success`

| Current | Render order (updated) |
|---|---|
| whatHappensNext | whatHappensNext |
| confirmationEmail | confirmationEmail |
| certificateLinkLead | certificateLinkLead |
| manageObligationsLink | **statementLinkLead** |
| certificateLinkSuffix | **manageObligationsLink** |
| statementLinkLead | **certificateLinkSuffix** |
| statementLinkSuffix | statementLinkSuffix |
| regulatorMayAsk | regulatorMayAsk |
| regulatorBullet1 | regulatorBullet1 |
| regulatorBullet2 | regulatorBullet2 |
| publicRegisterLead | publicRegisterLead |
| publicRegisterLink | publicRegisterLink |
| resubmitLead | resubmitLead |
| returnLink | returnLink |
| viewCertificateButton | viewCertificateButton |
| viewStatementButton | viewStatementButton |

`compliance-success.njk` renders one paragraph
`{{ documentLinkLead }} <link>{{ manageObligationsLink }}</link> {{ documentLinkSuffix }}`,
so both `*LinkLead` keys sit before `manageObligationsLink`, which sits before
both `*LinkSuffix` keys. Everything else already matches.

#### `compliance.components.about`  — already in render order ✅
25 keys already match the block order of `compliance-about.njk` +
`certificate/index.njk` + `statement/index.njk`
(`introPrefix, introSuffix, bullet1-3, description1, mustIntro, mustBullet1-3,
warning, howToTitle, howToDescription, howToBeforeSubmitIntro, howToBullet1-3,
howToBulletFullName, regulatorContact, finalStatusIntro, finalStatusBullet1-2,
finalStatus, alreadySubmittedLead, viewSubmissionButton`).

#### `compliance.components.declaration` / `regulatorInset` / `overallStatus`  — already correct ✅
`declaration`: `heading, intro, bullet1, bullet2, bullet3, fullNameLabel,
submitButton, cancelLink` matches the form.

### `compliance.errors`  — no change
`submitDeclaration, prepareCertificate, prepareStatement, missingSubmitCache`
are thrown `Boom` messages, not rendered in a page sequence. Current grouping
(submit-flow order) is fine.

### `compliance.validation`

| Current | Render order (updated) |
|---|---|
| fullName | **regulation43** |
| regulation43 | **fullName** |

On `cso/statement-submit` (the only page with both) the Regulation 43 radios
render before the full-name input, so error-summary entries appear in that
order. Nested `fullName{empty, tooShort, tooLong, invalidChars}` matches
`getFullNameErrorKey()`; `regulation43{empty}` single key.
*(Lower confidence: `fullName` is the only validation used on
`producer/certificate-submit`. If you prefer "most-shared key first", leave
`fullName` first.)*

---

## `prns`  — reordered

### `prns` (direct children)

| Current | Render order (updated) |
|---|---|
| prn | **list** |
| list | **prn** |

The PRN/PERN **list** page is the entry point; the **detail** (`prn`) page is
reached by clicking a row.

### `prns.list`

| Current | Render order (updated) |
|---|---|
| pageHeading | pageHeading |
| noPrnsFound | **resultsSummary** |
| resultsSummary | **noPrnsFound** |
| table | table |

`organisations/prns/index.njk`: `resultsSummary` renders in the
`{% if prns.length %}` branch (line 18) before `noPrnsFound` in the `{% else %}`
(line 21). `table` (`number, type, status, material, tonnage, issuedAt, issuer,
view, viewHiddenText`) already matches `buildPrnsTable()` in the controller.
`viewHiddenText` is **unused** (kept last).

### `prns.prn`

Currently alphabetical (42 keys). Updated to match `organisations/prns/prn/index.njk`
top-to-bottom, with 9 unreferenced keys moved to the end.

| # | Current (alphabetical) | Render order (updated) |
|---|---|---|
| 1 | acceptThisPern | pageHeading |
| 2 | acceptThisPrn | prnNumber |
| 3 | acceptanceYear | pernNumber |
| 4 | acceptanceYears | year |
| 5 | acceptedTowardsRecyclingObligations | status |
| 6 | accreditationNumber | statusTypes |
| 7 | authorisedBy | statusMeaning |
| 8 | dateIssued | statusMeaningText |
| 9 | downloadThisPern | issuedBy |
| 10 | downloadThisPernAwaitingAcceptance | reprocessingSite |
| 11 | downloadThisPrn | authorisedBy |
| 12 | downloadThisPrnAwaitingAcceptance | position |
| 13 | isDecemberWaste | accreditationNumber |
| 14 | isNotDecemberWaste | prnDetails |
| 15 | issuedBy | pernDetails |
| 16 | issuerNote | dateIssued |
| 17 | material | relatesToWasteReceivedInDecember |
| 18 | note | isDecemberWaste |
| 19 | notProvided | isNotDecemberWaste |
| 20 | packagingExportRecyclingNote | material |
| 21 | packagingProducerOrComplianceScheme | recyclingProcess |
| 22 | pageHeading | tonnage |
| 23 | pageTitlePern | packagingProducerOrComplianceScheme |
| 24 | pageTitlePrn | issuerNote |
| 25 | pernDetails | notProvided |
| 26 | pernNumber | acceptThisPrn |
| 27 | position | acceptThisPern |
| 28 | prnDetails | rejectThisPrn |
| 29 | prnNumber | rejectThisPern |
| 30 | recyclingProcess | downloadThisPrn |
| 31 | rejectThisPern | downloadThisPern |
| 32 | rejectThisPrn | downloadThisPrnAwaitingAcceptance |
| 33 | relatesToWasteReceivedInDecember | downloadThisPernAwaitingAcceptance |
| 34 | reprocessingSite | *acceptanceYear* (unused) |
| 35 | status | *acceptanceYears* (unused) |
| 36 | statusMeaning | *acceptedTowardsRecyclingObligations* (unused) |
| 37 | statusMeaningText | *note* (unused) |
| 38 | statusTypes | *packagingExportRecyclingNote* (unused) |
| 39 | thisPernRelatesToWasteExportedForReprocessingInDecember | *pageTitlePern* (unused) |
| 40 | thisPrnRelatesToWasteReceivedForReprocessingInDecember | *pageTitlePrn* (unused) |
| 41 | tonnage | *thisPernRelatesToWasteExportedForReprocessingInDecember* (unused) |
| 42 | year | *thisPrnRelatesToWasteReceivedForReprocessingInDecember* (unused) |

Paired PRN/PERN keys are ordered PRN-first to match the
`… if isPrn else …` expressions in the template.

**Unused keys** (no `p.t(...)` / `translate(...)` reference anywhere in `src/`):
`acceptanceYear`, `acceptanceYears`, `acceptedTowardsRecyclingObligations`,
`note`, `packagingExportRecyclingNote`, `pageTitlePern`, `pageTitlePrn`,
`thisPernRelatesToWasteExportedForReprocessingInDecember`,
`thisPrnRelatesToWasteReceivedForReprocessingInDecember`. Consider deleting
these (and their `cy.json` counterparts) in a follow-up.

#### `prns.prn.statusTypes`

| Current | Render order (updated) |
|---|---|
| accepted | accepted |
| awaitingAcceptance | cancelled |
| cancelled | rejected |
| rejected | awaitingAcceptance |

#### `prns.prn.statusMeaningText`

| Current | Render order (updated) |
|---|---|
| common | accepted |
| awaitingAcceptance | cancelled |
| accepted | rejected |
| rejected | awaitingAcceptance |
| cancelled | common |

Both follow the `if prn.status == "Accepted" … elif "Cancelled" … elif
"Rejected" … else (awaiting)` chain in the template; `statusMeaningText.common`
wraps the chosen phrase and is emitted last.

---

## Summary of objects changed

| Object | Change |
|---|---|
| `common` | children reordered (chrome objects before content scalars) |
| `common.nav` | reordered to header render order |
| `common.phaseBanner` | `lead/feedbackLink/leadAfterLink` before `tag/label` |
| `cookies.table` | `essentialCookiesWeUse` (caption) moved first |
| `compliance` | grouped by journey (certificate flow, then statement flow) |
| `compliance.statementSubmit.components` | `regulation43` before `declaration` |
| `compliance.components` | `about` first; `overallStatus` before `obligationsTable` |
| `compliance.components.summaryList` | scheme rows before `organisationId`; `submissionDate` before `regulator` |
| `compliance.components.obligationsTable` | `glassHeading` moved after the main table; `material` before `notAvailableYet`/`obligationStatus` |
| `compliance.components.success` | `*LinkLead` grouped before `manageObligationsLink` before `*LinkSuffix` |
| `compliance.validation` | `regulation43` before `fullName` |
| `prns` | `list` before `prn` |
| `prns.list` | `resultsSummary` before `noPrnsFound` |
| `prns.prn` | alphabetical → template render order; 9 unused keys to the end |
| `prns.prn.statusTypes` | chain order (accepted, cancelled, rejected, awaiting) |
| `prns.prn.statusMeaningText` | chain order, `common` last |

**Unchanged (already in render order):** `errorPages`, `auth`,
`common.languageSwitcher`, `common.footer`, `cookies` (top level),
`compliance.certificate*`, `compliance.statement`, `compliance.statementSuccess`,
`compliance.statementView`, `compliance.components.about`,
`compliance.components.declaration`, `compliance.regulators`,
`compliance.errors`, `prns.list.table`.
