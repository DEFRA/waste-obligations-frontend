# 0008: Sanitise application-error logs in production

**Status:** Accepted—retrospective.

## Context

Authentication callback and downstream errors can contain citizen or company data. Redaction does not protect values interpolated into log messages or raw error objects.

## Decision

For application errors, use `logApplicationError()` with a safe deployed message and only approved opaque identifiers. In production it emits that message without the raw error; outside production it retains the structured raw error for diagnosis.

## Rationale basis

**Documented:** [PR #133](https://github.com/DEFRA/waste-obligations-frontend/pull/133) says it removes Azure AD B2C callback details that may contain personal data, preserves raw errors locally, and logs only safe messages in production. **Corroborated:** the helper, two-mode tests, 29 current call sites and repository operating guidance retain this policy. **Inference:** future application-error paths should follow the same boundary; this is not proof that every log path is already safe.

## Consequences and evolution

PR #133 (`ec2d6c6`, merge `04d4663`) introduced the helper and migrated auth, API and cache paths. PR #152 uses it for response-validation warnings; PR #158 (`0305f902`) applies it to downstream request errors while excluding request data. Existing raw/error-derived paths at `redis-client.js`, `errors.js` and `src/index.js` were not migrated and remain an explicit audit gap, not counter-proof of an actual personal-data disclosure.

## Evidence

- [PR #133](https://github.com/DEFRA/waste-obligations-frontend/pull/133), [PR #152](https://github.com/DEFRA/waste-obligations-frontend/pull/152), [PR #158](https://github.com/DEFRA/waste-obligations-frontend/pull/158).
- `src/server/common/helpers/logging/application-error.js`, its test, `AGENTS.md`, `src/server/common/helpers/redis-client.js`, `src/server/common/helpers/errors.js`, and `src/index.js`.

**Confidence:** High for the helper policy; medium for application-wide adoption.
