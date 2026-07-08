# WireMock mappings

Static stubs for integration tests (`npm run test:integration`) when downstream APIs are
pointed at WireMock via `compose.yml` (default for the packaged app service).

## Shared

| File                | Purpose                                                        |
| ------------------- | -------------------------------------------------------------- |
| `oauth2-token.json` | OAuth client-credentials token for backend-account bearer auth |

## CSoC (`csoc/`)

Used by CSoC statement journeys in `integration/journeys/csoc-*.spec.js`.

| File                                                               | Endpoint                                                                                           |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| `backend-account-user-organisations.json`                          | `GET /api/users/user-organisations?userId={csoc user}`                                             |
| `backend-account-compliance-schemes.json`                          | `GET /api/compliance-schemes/get-for-operator`                                                     |
| `waste-organisations-get-scheme.json`                              | `GET /organisations/{schemeId}`                                                                    |
| `waste-obligations-compliance-declarations-empty.json`             | `GET .../compliance-declarations?obligationYear=2026` (no prior submission)                        |
| `waste-obligations-compliance-declarations-submitted-2025.json`    | `GET .../compliance-declarations?obligationYear=2025` (already submitted)                          |
| `waste-obligations-organisation-obligations.json`                  | `GET .../obligations` (Met)                                                                        |
| `waste-obligations-organisation-obligations-not-met-2024.json`     | `GET .../obligations?obligationYear=2024` (NotMet)                                                 |
| `waste-obligations-compliance-declarations-empty-2024.json`        | `GET .../compliance-declarations?obligationYear=2024`                                              |
| `waste-obligations-create-compliance-declaration.json`             | `POST .../compliance-declarations` (2026 success)                                                  |
| `waste-obligations-create-compliance-declaration-failure.json`     | `POST .../compliance-declarations` when body has `submitterName: "Integration Failure User"` → 503 |
| `waste-obligations-create-compliance-declaration-reg43-no.json`    | `POST .../compliance-declarations` when body has `isRegulation43Compliant: false` → 201            |
| `waste-obligations-get-compliance-declaration.json`                | `GET .../compliance-declarations/{id}` (2026 submit)                                               |
| `waste-obligations-get-compliance-declaration-reg43-no.json`       | `GET .../compliance-declarations/{id}` (regulation 43 no)                                          |
| `waste-obligations-get-compliance-declaration-submitted-2025.json` | `GET .../compliance-declarations/{id}` (2025 view)                                                 |

## Producer (`producer/`)

Used by producer certificate journeys in `integration/journeys/producer-*.spec.js`.

| File                                                               | Endpoint                                                                                           |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| `backend-account-user-organisations.json`                          | `GET /api/users/user-organisations?userId={producer user}`                                         |
| `waste-organisations-get-producer.json`                            | `GET /organisations/{organisationId}`                                                              |
| `waste-obligations-compliance-declarations-empty.json`             | `GET .../compliance-declarations?obligationYear=2026`                                              |
| `waste-obligations-compliance-declarations-submitted-2025.json`    | `GET .../compliance-declarations?obligationYear=2025`                                              |
| `waste-obligations-organisation-obligations.json`                  | `GET .../obligations` (Met)                                                                        |
| `waste-obligations-organisation-obligations-not-met-2024.json`     | `GET .../obligations?obligationYear=2024` (NotMet)                                                 |
| `waste-obligations-compliance-declarations-empty-2024.json`        | `GET .../compliance-declarations?obligationYear=2024`                                              |
| `waste-obligations-create-compliance-declaration.json`             | `POST .../compliance-declarations` (2026 success)                                                  |
| `waste-obligations-create-compliance-declaration-failure.json`     | `POST .../compliance-declarations` when body has `submitterName: "Integration Failure User"` → 503 |
| `waste-obligations-get-compliance-declaration.json`                | `GET .../compliance-declarations/{id}` (2026 submit)                                               |
| `waste-obligations-get-compliance-declaration-submitted-2025.json` | `GET .../compliance-declarations/{id}` (2025 view)                                                 |

Static stubs return `Content-Type: application/json` (required by the frontend API client).

Fixture IDs match `integration/fixtures/csoc-scenario.js` and
`integration/fixtures/producer-scenario.js`.

Already-submitted scenarios use `obligationYear=2025`; happy-path submit journeys use
`obligationYear=2026`. Not-met obligation display uses `obligationYear=2024`.

`CSOC_SUBMIT_FAILURE_FULL_NAME` and `PRODUCER_SUBMIT_FAILURE_FULL_NAME` in fixtures must match the failure POST stub `submitterName`.
`CSOC_REG43_NO_DECLARATION_ID` must match the regulation 43 no GET/POST stubs.
