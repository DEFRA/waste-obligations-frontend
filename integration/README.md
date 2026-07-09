# Integration tests

Browser-based integration coverage for CSoC and producer compliance journeys. Downstream APIs
are stubbed with WireMock; the app under test is the real `waste-obligations-frontend` server.

## Stack

| Layer           | Approach                                                                                                   |
| --------------- | ---------------------------------------------------------------------------------------------------------- |
| Downstream APIs | WireMock fixtures in `compose/wiremock/mappings/`                                                          |
| App under test  | `compose.integration.yml` (redis + wiremock + app) or `npm run integration:serve` with WireMock env        |
| Test runner     | Playwright (`integration/global-setup.js` checks app, WireMock, Redis before tests run)                    |
| Auth            | `test-helpers/start-integration-server.js` swaps in mock Azure AD B2C (kept out of production plugin code) |

## Run locally

### Option A — Docker app (HTTP, matches CI)

```bash
npm install
npm run integration:install-browsers
npm run integration:ci
```

`integration:ci` starts the slim integration compose stack (no LocalStack) with mock auth enabled
and runs Playwright against `http://localhost:3000`.

API URLs in `compose.integration.yml` are hardcoded to WireMock so a host `.env` (e.g. from
`epr-local-environment`) cannot override them during substitution.

### Option B — Host app with mkcert (HTTPS)

1. Install dependencies and browsers:

   ```bash
   npm install
   npm run setup:certs
   npm run integration:install-browsers
   ```

2. Start dependencies and the app:

   ```bash
   npm run integration:deps
   npm run integration:serve   # separate terminal — https://localhost:3000
   ```

3. Run tests (default base URL is `https://localhost:3000`):

   ```bash
   npm run test:integration
   ```

   Override the base URL when needed:

   ```bash
   INTEGRATION_BASE_URL=http://localhost:3000 npm run test:integration
   ```

4. Tear down:

   ```bash
   npm run integration:down
   ```

## Journeys

| Journey                                  | Spec                                                                           |
| ---------------------------------------- | ------------------------------------------------------------------------------ |
| CSoC statement submit (happy path)       | `integration/journeys/csoc-statement-submit.spec.js`                           |
| CSoC statement already submitted         | `integration/journeys/csoc-statement-already-submitted.spec.js`                |
| CSoC statement submit validation         | `integration/journeys/csoc-statement-submit-validation.spec.js`                |
| CSoC statement submit failure            | `integration/journeys/csoc-statement-submit-failure.spec.js`                   |
| CSoC statement not met obligations       | `integration/journeys/csoc-statement-submit-not-met-obligations.spec.js`       |
| CSoC statement regulation 43 no          | `integration/journeys/csoc-statement-submit-regulation43-no.spec.js`           |
| Producer certificate submit (happy path) | `integration/journeys/producer-certificate-submit.spec.js`                     |
| Producer certificate already submitted   | `integration/journeys/producer-certificate-already-submitted.spec.js`          |
| Producer certificate submit validation   | `integration/journeys/producer-certificate-submit-validation.spec.js`          |
| Producer certificate submit failure      | `integration/journeys/producer-certificate-submit-failure.spec.js`             |
| Producer certificate not met obligations | `integration/journeys/producer-certificate-submit-not-met-obligations.spec.js` |

WireMock fixtures live under `compose/wiremock/mappings/`.

## Fixture IDs

Shared constants live in `integration/fixtures/csoc-scenario.js`,
`integration/fixtures/producer-scenario.js`, and `integration/fixtures/users.js`. They must stay
aligned with WireMock JSON bodies.

CSoC and producer journeys use **different integration users** and **scenario-specific scheme or
organisation IDs** (not obligation years) to drive WireMock responses. Mock auth selects the
producer profile when sign-in is triggered from a `/compliance/producer/...` return URL.

| Scenario ID role    | CSoC constant                      | Producer constant                            |
| ------------------- | ---------------------------------- | -------------------------------------------- |
| Happy path          | `CSOC_COMPLIANCE_SCHEME_ID`        | `PRODUCER_ORGANISATION_ID`                   |
| Already submitted   | `CSOC_ALREADY_SUBMITTED_SCHEME_ID` | `PRODUCER_ALREADY_SUBMITTED_ORGANISATION_ID` |
| Not-met obligations | `CSOC_NOT_MET_SCHEME_ID`           | `PRODUCER_NOT_MET_ORGANISATION_ID`           |

All journeys use `INTEGRATION_OBLIGATION_YEAR` (currently 2026) as the `?year=` query parameter.

Failure and regulation-43 scenarios use `submitterName` / declaration IDs on the happy-path scheme.

## Test isolation

Each Playwright test clears cookies and permissions in `integration/fixtures/test.js` before
running. Playwright also creates a fresh browser context per test by default, so Redis session state
from a prior test cannot be reused unless cookies are shared explicitly.

## Troubleshooting

If tests fail with technical errors or stale API responses after changing WireMock mappings:

1. **Restart WireMock** so new JSON files are loaded (the container watches the mappings volume,
   but a restart is reliable after adding files):

   ```bash
   docker restart waste-obligations-frontend-wiremock-1
   ```

2. **Flush Redis** — the app caches downstream API responses; a cached 404 survives until the
   cache is cleared:

   ```bash
   docker exec waste-obligations-frontend-redis-1 redis-cli FLUSHALL
   ```

3. Confirm stubs respond as expected, for example:

   ```bash
   curl "http://localhost:9080/organisations/a1b2c3d4-e5f6-4789-abcd-ef1234567890/compliance-declarations?obligationYear=2026"
   ```

## CI

Pull requests run `npm run integration:ci` in `.github/workflows/check-pull-request.yml`.
On failure, Playwright captures a **full-page** screenshot (`screenshot: { mode: 'only-on-failure', fullPage: true }`)
and uploads the HTML report plus `test-results/` as a CI artifact.

## Mock auth safety

Production startup (`node .` / `compose.yml`) always uses real Azure AD B2C. Mock auth is only
registered when the integration entry point (`test-helpers/start-integration-server.js`) is used —
for example via `compose.integration.yml`, `npm run integration:serve`, or `npm run integration:ci`.
