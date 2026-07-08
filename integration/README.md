# Integration tests

Browser-based integration coverage for CSoC and producer compliance journeys. Downstream APIs
are stubbed with WireMock; the app under test is the real `waste-obligations-frontend` server.

## Stack

| Layer           | Approach                                                                                          |
| --------------- | ------------------------------------------------------------------------------------------------- |
| Downstream APIs | WireMock fixtures in `compose/wiremock/mappings/`                                                 |
| App under test  | `compose.integration.yml` (redis + wiremock + app) or local `npm start` with WireMock env         |
| Test runner     | Playwright (`integration/global-setup.js` checks app, WireMock, Redis before tests run)           |
| Auth            | `ENABLE_MOCK_AUTH=true` (mock Azure AD B2C — integration only, not enabled by default in compose) |

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

```bash
npm install
npm run setup:certs
npm run integration:install-browsers
npm run integration:deps
npm run integration:serve   # separate terminal — https://localhost:3000
npm run test:integration    # default base URL is https://localhost:3000
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

Shared constants live in `integration/fixtures/csoc-scenario.js` and
`integration/fixtures/producer-scenario.js`. They must stay aligned with WireMock JSON bodies.

CSoC and producer journeys use **different integration users, organisations, and failure
trigger names**. Mock auth selects the producer profile when sign-in is triggered from a
`/compliance/producer/...` return URL.

| Year / trigger | Purpose                                                                                                                              |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `2026`         | Happy-path submit, validation, failure (via `CSOC_SUBMIT_FAILURE_FULL_NAME` / `PRODUCER_SUBMIT_FAILURE_FULL_NAME`), regulation 43 no |
| `2025`         | Already-submitted scenarios                                                                                                          |
| `2024`         | Not-met obligations on submit page                                                                                                   |

## CI

Pull requests run `npm run integration:ci` in `.github/workflows/check-pull-request.yml`.
Playwright HTML report and `test-results/` upload on failure.

## Mock auth safety

`compose.yml` defaults `ENABLE_MOCK_AUTH` to **false**. Integration scripts (`integration:up`,
`integration:ci`, `integration:serve`) set `ENABLE_MOCK_AUTH=true` explicitly.
