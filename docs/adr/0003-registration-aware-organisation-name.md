# 0003: Select organisation names from the relevant registration

**Status:** Accepted—retrospective.

## Context

Waste Organisations supplies both `name` and `tradingName` with registration history. The frontend displays and submits an organisation identity for a requested obligation year; one source field is not correct for every registration type.

## Decision

For the requested year, select the most recently updated matching registration, preferring a `REGISTERED` registration when available. Use `organisation.name` for `LARGE_PRODUCER` and unknown registration types; use `organisation.tradingName` for `COMPLIANCE_SCHEME`; fall back to `organisation.name` when the selected value is absent. Use the same resolver for display and declaration submission.

## Rationale basis

**Documented:** [PR #46](https://github.com/DEFRA/waste-obligations-frontend/pull/46) says acceptance criteria determine whether `name` or `tradingName` is displayed/submitted and that both use the same function. **Corroborated:** the shared formatter serves both producer certificate and CSO statement paths, and their tests lock the output. **Inference:** the rule is a durable source-to-domain policy because changing it changes user-visible and submitted organisation identity. The source does not prove that `name` is a legal name, so this record avoids that claim.

## Consequences and evolution

PR #46 (`e051b927`) introduced the rule in the certificate-submit controller. PR #90 (`70fa673f`) moved it into the shared formatter; PR #143 (`bbc0f97`) retained it during route relocation. No superseding change was found. The original PR calls the implementation relatively crude and suggests cache normalisation as a future option.

The current tests do not cover multiple matching registrations, registered-versus-unregistered preference, or an unknown registration type, even though the code specifies those outcomes. Those are confidence gaps, not an assertion that the behaviour is wrong.

## Evidence

- [PR #46](https://github.com/DEFRA/waste-obligations-frontend/pull/46), [PR #90](https://github.com/DEFRA/waste-obligations-frontend/pull/90), [PR #143](https://github.com/DEFRA/waste-obligations-frontend/pull/143).
- `src/server/routes/_shared/compliance/compliance-submit/organisation-formatters.js`, `api-payload.js`, producer certificate-submit and CSO statement-submit view models/controllers, and their formatter/payload tests.

**Confidence:** High for retained policy; medium for business rationale and untested registration edge cases.
