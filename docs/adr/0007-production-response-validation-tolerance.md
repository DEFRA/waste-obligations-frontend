# 0007: Continue production requests after failed downstream response validation

**Status:** Accepted—retrospective.

## Context

Schema-bearing downstream responses are validated centrally. Initially, every failed response schema validation threw an error. Production now has a distinct failure path.

## Decision

When a downstream response supplied with a Joi schema fails validation, production logs a safe warning and returns the raw response. Non-production continues to throw `ApiResponseValidationError`. This is separate from the decision to centralise API-client transport and validation ownership.

## Rationale basis

**Documented:** [PR #152](https://github.com/DEFRA/waste-obligations-frontend/pull/152) explicitly says production should warn and return raw data so the request can continue, while non-production should still throw. **Corroborated:** the helper remains used by schema-bearing methods in `BaseApiService` and tests cover both branches. **Inference:** retaining this shared helper behaviour makes it a cross-client operability policy. The history does not explain the availability-versus-data-integrity trade-off.

## Consequences and evolution

PR #52 (`223bb9c`) introduced strict response validation. PR #152 (`54fdfce`, merge `d6cbb09`) made it environment-dependent; no later change modifies the helper. A production validation failure bypasses Joi conversion/defaulting and can reach callers as raw data. For cached schema-bearing GETs it can be cached because validation occurs before the cache write. Calls without a response schema are outside this policy.

## Evidence

- [PR #52](https://github.com/DEFRA/waste-obligations-frontend/pull/52), [PR #152](https://github.com/DEFRA/waste-obligations-frontend/pull/152).
- `src/server/services/schemas/validate-api-response.js`, `src/server/services/schemas/validate-api-response.test.js`, and `src/server/services/base/base-api.service.js`.

**Confidence:** Medium. The implementation and stated behaviour are clear; intended acceptable malformed-response scope is not.
