# WireMock mappings

Static stubs for integration tests (`npm run test:integration`) when downstream APIs are
pointed at WireMock via `compose.integration.yml` or `integration:serve`.

## Shared

| File                | Purpose                                                        |
| ------------------- | -------------------------------------------------------------- |
| `oauth2-token.json` | OAuth client-credentials token for backend-account bearer auth |

## Scenario routing

Integration scenarios are selected by **scheme ID** (CSoC) or **organisation ID** (producer), not
by obligation year. All journeys use `INTEGRATION_OBLIGATION_YEAR` (2026) from
`integration/fixtures/shared.js`.

| Scenario            | CSoC scheme ID                         | Producer organisation ID               |
| ------------------- | -------------------------------------- | -------------------------------------- |
| Happy path          | `a1b2c3d4-e5f6-4789-abcd-ef1234567890` | `d8f98659-87d8-4ef4-a9f2-e72f1bc98423` |
| Already submitted   | `a1b2c3d4-e5f6-4789-abcd-ef1234567891` | `d8f98659-87d8-4ef4-a9f2-e72f1bc98424` |
| Not-met obligations | `a1b2c3d4-e5f6-4789-abcd-ef1234567892` | `d8f98659-87d8-4ef4-a9f2-e72f1bc98425` |
| No data yet         | `a1b2c3d4-e5f6-4789-abcd-ef1234567893` | `d8f98659-87d8-4ef4-a9f2-e72f1bc98426` |
| Cancelled           | `a1b2c3d4-e5f6-4789-abcd-ef1234567894` | `d8f98659-87d8-4ef4-a9f2-e72f1bc98427` |

Fixture constants in `integration/fixtures/csoc-scenario.js` and
`integration/fixtures/producer-scenario.js` must stay aligned with these IDs. Integration user
IDs live in `test-helpers/integration-users.js` and must match `backend-account-user-organisations`
stubs and mock auth.

## CSoC (`csoc/`)

| File                                                                       | Endpoint                                                                                                 |
| -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `backend-account-user-organisations.json`                                  | `GET /api/users/user-organisations?userId={csoc user}`                                                   |
| `backend-account-compliance-schemes.json`                                  | `GET /api/compliance-schemes/get-for-operator` (lists all scenario schemes)                              |
| `waste-organisations-get-scheme.json`                                      | `GET /organisations/{happy-path schemeId}`                                                               |
| `waste-organisations-get-scheme-already-submitted.json`                    | `GET /organisations/{already-submitted schemeId}`                                                        |
| `waste-organisations-get-scheme-not-met.json`                              | `GET /organisations/{not-met schemeId}`                                                                  |
| `waste-organisations-get-scheme-no-data-yet.json`                          | `GET /organisations/{no-data-yet schemeId}`                                                              |
| `waste-organisations-get-scheme-cancelled.json`                            | `GET /organisations/{cancelled schemeId}`                                                                |
| `waste-obligations-compliance-declarations-cancelled.json`                 | `GET .../compliance-declarations?obligationYear=2026` (cancelled scheme)                                 |
| `waste-obligations-organisation-obligations-cancelled.json`                | `GET .../obligations?obligationYear=2026` (Met, cancelled scheme)                                        |
| `waste-obligations-prns-awaiting-acceptance-cancelled-scheme.json`         | `GET .../prns?status=AwaitingAcceptance` (no PRNs, cancelled scheme)                                     |
| `waste-obligations-prns-awaiting-acceptance-already-submitted-scheme.json` | `GET .../prns?status=AwaitingAcceptance` (no PRNs, already-submitted scheme)                             |
| `waste-obligations-compliance-declarations-empty.json`                     | `GET .../compliance-declarations?obligationYear=2026` (happy path, empty)                                |
| `waste-obligations-compliance-declarations-empty-not-met-scheme.json`      | `GET .../compliance-declarations?obligationYear=2026` (not-met scheme, empty)                            |
| `waste-obligations-compliance-declarations-empty-no-data-yet-scheme.json`  | `GET .../compliance-declarations?obligationYear=2026` (no-data-yet scheme, empty)                        |
| `waste-obligations-compliance-declarations-empty-next-year.json`           | `GET .../compliance-declarations?obligationYear=2027` (happy path, empty; manage page for the next year) |
| `waste-obligations-compliance-declarations-already-submitted.json`         | `GET .../compliance-declarations?obligationYear=2026` (already submitted)                                |
| `waste-obligations-organisation-obligations.json`                          | `GET .../obligations?obligationYear=2026` (Met, happy path)                                              |
| `waste-obligations-organisation-obligations-already-submitted.json`        | `GET .../obligations?obligationYear=2026` (Met, already-submitted scheme)                                |
| `waste-obligations-organisation-obligations-not-met.json`                  | `GET .../obligations?obligationYear=2026` (NotMet, not-met scheme)                                       |
| `waste-obligations-organisation-obligations-no-data-yet.json`              | `GET .../obligations?obligationYear=2026` (every material NoDataYet, no-data-yet scheme)                 |
| `waste-obligations-prns-awaiting-acceptance.json`                          | `GET .../prns?status=AwaitingAcceptance` (happy path count)                                              |
| `waste-obligations-get-prn.json`                                           | `GET .../prns/{prnId}` (happy path awaiting-acceptance PRN)                                              |
| `waste-obligations-get-prn-reject-flow.json`                               | `GET .../prns/{reject-flow prnId}` while scenario `csoc-pern-reject` is Started (awaiting PERN)          |
| `waste-obligations-patch-prn-reject-flow.json`                             | `PATCH` that note, moving `csoc-pern-reject` to Rejected (204)                                           |
| `waste-obligations-get-prn-reject-flow-rejected.json`                      | `GET` the same note once `csoc-pern-reject` is Rejected                                                  |
| `waste-obligations-create-compliance-declaration.json`                     | `POST .../compliance-declarations` (happy path success)                                                  |
| `waste-obligations-create-compliance-declaration-failure.json`             | `POST` when `submitterName: "CSoC Integration Failure User"` → 503                                       |
| `waste-obligations-create-compliance-declaration-reg43-no.json`            | `POST` when `isRegulation43Compliant: false` → 201                                                       |
| `waste-obligations-get-compliance-declaration.json`                        | `GET .../compliance-declarations/{id}` (happy path submit)                                               |
| `waste-obligations-get-compliance-declaration-already-submitted.json`      | `GET .../compliance-declarations/{id}` (already submitted view)                                          |
| `waste-obligations-get-compliance-declaration-reg43-no.json`               | `GET .../compliance-declarations/{id}` (regulation 43 no)                                                |
| `waste-obligations-get-compliance-declaration-no-data-yet.json`            | `GET .../compliance-declarations/{id}` (submitted with a NoDataYet material)                             |

## Producer (`producer/`)

| File                                                                    | Endpoint                                                                                 |
| ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `backend-account-user-organisations.json`                               | `GET /api/users/user-organisations?userId={producer user}` (all orgs)                    |
| `waste-organisations-get-producer.json`                                 | `GET /organisations/{happy-path organisationId}`                                         |
| `waste-organisations-get-producer-already-submitted.json`               | `GET /organisations/{already-submitted organisationId}`                                  |
| `waste-organisations-get-producer-not-met.json`                         | `GET /organisations/{not-met organisationId}`                                            |
| `waste-organisations-get-producer-cancelled.json`                       | `GET /organisations/{cancelled organisationId}`                                          |
| `waste-obligations-compliance-declarations-cancelled.json`              | `GET .../compliance-declarations?obligationYear=2026` (cancelled org)                    |
| `waste-obligations-organisation-obligations-cancelled.json`             | `GET .../obligations?obligationYear=2026` (Met, cancelled org)                           |
| `waste-obligations-prns-awaiting-acceptance-cancelled-org.json`         | `GET .../prns?status=AwaitingAcceptance` (no PRNs, cancelled org)                        |
| `waste-obligations-prns-awaiting-acceptance-already-submitted-org.json` | `GET .../prns?status=AwaitingAcceptance` (no PRNs, already-submitted org)                |
| `waste-obligations-compliance-declarations-empty.json`                  | `GET .../compliance-declarations?obligationYear=2026` (happy path)                       |
| `waste-obligations-compliance-declarations-empty-not-met-org.json`      | `GET .../compliance-declarations?obligationYear=2026` (not-met org, empty)               |
| `waste-obligations-compliance-declarations-empty-no-data-yet-org.json`  | `GET .../compliance-declarations?obligationYear=2026` (no-data-yet org, empty)           |
| `waste-obligations-compliance-declarations-already-submitted.json`      | `GET .../compliance-declarations?obligationYear=2026` (already submitted)                |
| `waste-obligations-organisation-obligations.json`                       | `GET .../obligations?obligationYear=2026` (Met)                                          |
| `waste-obligations-organisation-obligations-already-submitted.json`     | `GET .../obligations?obligationYear=2026` (Met, already-submitted org)                   |
| `waste-obligations-organisation-obligations-not-met.json`               | `GET .../obligations?obligationYear=2026` (NotMet)                                       |
| `waste-obligations-prns-awaiting-acceptance.json`                       | `GET .../prns?status=AwaitingAcceptance&page=1` (first two notes, page size 2, total 4)  |
| `waste-obligations-prns-awaiting-acceptance-page-2.json`                | `GET .../prns?status=AwaitingAcceptance&page=2` (repeats PRN001, then PRN003 and PRN004) |
| `waste-obligations-get-prn.json`                                        | `GET .../prns/{prnId}` (happy path awaiting-acceptance PRN)                              |
| `waste-obligations-get-prn-reject-flow.json`                            | `GET .../prns/{reject-flow prnId}` while scenario `producer-prn-reject` is Started       |
| `waste-obligations-patch-prn-reject-flow.json`                          | `PATCH` that note, moving `producer-prn-reject` to Rejected (204)                        |
| `waste-obligations-get-prn-reject-flow-rejected.json`                   | `GET` the same note once `producer-prn-reject` is Rejected                               |
| `waste-obligations-create-compliance-declaration.json`                  | `POST .../compliance-declarations` (happy path success)                                  |
| `waste-obligations-create-compliance-declaration-failure.json`          | `POST` when `submitterName: "Producer Integration Failure User"` → 503                   |
| `waste-obligations-get-compliance-declaration.json`                     | `GET .../compliance-declarations/{id}` (happy path submit)                               |
| `waste-obligations-get-compliance-declaration-already-submitted.json`   | `GET .../compliance-declarations/{id}` (already submitted view)                          |
| `waste-obligations-get-compliance-declaration-no-data-yet.json`         | `GET .../compliance-declarations/{id}` (submitted with a NoDataYet material)             |

Static stubs return `Content-Type: application/json` (required by the frontend API client).

`CSOC_SUBMIT_FAILURE_FULL_NAME` and `PRODUCER_SUBMIT_FAILURE_FULL_NAME` in fixtures must match the failure POST stub `submitterName`.
`CSOC_REG43_NO_DECLARATION_ID` must match the regulation 43 no GET/POST stubs.
