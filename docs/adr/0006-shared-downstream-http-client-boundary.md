# 0006: Keep shared outbound HTTP policy in a constrained client boundary

**Status:** Accepted—retrospective.

## Context

The frontend calls Backend Account, Waste Organisations and Waste Obligations APIs. Those calls share transport concerns but retain source-specific endpoint, query and schema semantics.

## Decision

Use concrete API services for endpoint paths, schemas and domain mapping, backed by `BaseApiService` for shared configuration/auth modes, trace and load-test headers, JSON/error handling, optional cache mechanics and GET-only resilience. Do not treat this as a universal integration abstraction or an enabled system-wide response-cache policy.

## Rationale basis

**Documented:** [PR #52](https://github.com/DEFRA/waste-obligations-frontend/pull/52) introduces Joi request/response validation because the project does not use TypeScript. [PR #125](https://github.com/DEFRA/waste-obligations-frontend/pull/125) says only safe transient failures should be retried; mutations remain one request. [PR #127](https://github.com/DEFRA/waste-obligations-frontend/pull/127) documents forwarding the load-test correlation header through the shared client. **Corroborated:** all three current services extend the base and are instantiated together. **Inference:** the accumulated common transport ownership is a durable boundary; history does not document why inheritance was selected over another implementation shape.

## Consequences and evolution

PR #14 (`5e17116`) introduced the service layer. PR #52 (`223bb9c`) shared schema validation; PR #54 (`601dc07`) scoped OAuth/token caching to Backend Account and moved tracing to async context; PR #125 (`1fb0fcc`) added GET-only retry; PR #127 (`d81cfd8`) added load-test propagation. PR #138 (`5f4e7fe`) is a mechanical request-method consolidation.

Concrete services retain paths, cache keys, query encoding and schema choice. `cacheResponses` defaults to false and no current factory enables it; the record therefore does not make a response-caching decision. Production response-schema tolerance is separately recorded in ADR 0007.

## Evidence

- [PR #14](https://github.com/DEFRA/waste-obligations-frontend/pull/14), [PR #52](https://github.com/DEFRA/waste-obligations-frontend/pull/52), [PR #54](https://github.com/DEFRA/waste-obligations-frontend/pull/54), [PR #125](https://github.com/DEFRA/waste-obligations-frontend/pull/125), [PR #127](https://github.com/DEFRA/waste-obligations-frontend/pull/127).
- `src/server/plugins/api-services.js`, `src/server/services/base/base-api.service.js`, `src/server/services/base/request-resilience.js`, and the three `src/server/services/*-api.service.js` clients.

**Confidence:** High that the boundary is current; medium that every concern was intentionally designed as one original decision.
