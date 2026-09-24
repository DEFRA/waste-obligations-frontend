# 0001: Authorise producer and CSO business routes using current Account Service associations and action roles

**Status:** Accepted—retrospective.

## Context

The frontend serves two business actors. A direct producer acts for an enrolled organisation; a compliance scheme operator acts for a scheme associated with one of its enrolled operator organisations. Authentication alone must not authorise access to either actor's business data or restricted actions.

## Decision

Refresh the signed-in user's Account Service data before protected business-route checks and fail closed rather than use stale session membership. For direct producers, authorise the route `organisationId` by case-insensitive membership in the user's enrolled organisations. For CSOs, resolve the route `schemeId` through each enrolled operator organisation's Account Service scheme list; allow an operator-organisation route ID only when exactly one scheme is returned. Require `Approved Person` or `Delegated Person` for restricted actions, while retaining actor association as a separate check.

## Rationale basis

**Documented:** [PR #51](https://github.com/DEFRA/waste-obligations-frontend/pull/51) explicitly adds an enrolled-organisation pre-handler before compliance handlers and returns 403 for non-enrolment. [PR #86](https://github.com/DEFRA/waste-obligations-frontend/pull/86) records the CSO correction to use scheme identity. [PR #99](https://github.com/DEFRA/waste-obligations-frontend/pull/99) establishes non-approved versus approved/delegated outcomes. **Corroborated:** current shared route helpers, middleware order and focused tests retain the layered model. **Inference:** the single-scheme fallback is a retained compatibility rule; no business explanation for it was found.

## Consequences and evolution

PR #51 (`15b0f0c`) introduced direct membership access. PR #86 (`96562e8`) separated CSO scheme identity from the operator identity. PR #99 (`2c16d0a`) introduced role gating. PR #124 (`dfce09b`) introduced shared Account Service refresh and removes stale-session fallback; PR #143 (`bbc0f97`) preserves it through the producer/CSO route split.

One operator's scheme-list 404 permits trying the next enrolled operator; other downstream failures are application errors, and no matching association is 403. View-only compliance routes omit the action-role gate. The decision depends on Account Service's external membership/scheme contract; it does not establish why its outages map to current error handling or which views basic users may access.

## Evidence

- [PR #51](https://github.com/DEFRA/waste-obligations-frontend/pull/51), [PR #86](https://github.com/DEFRA/waste-obligations-frontend/pull/86), [PR #99](https://github.com/DEFRA/waste-obligations-frontend/pull/99), [PR #124](https://github.com/DEFRA/waste-obligations-frontend/pull/124), [PR #143](https://github.com/DEFRA/waste-obligations-frontend/pull/143).
- `src/server/common/routes/middleware/current-organisation.js`, `refresh-session-user.js`, `approved-user.js`, `src/server/routes/_shared/compliance/_middlewares/current-compliance-scheme.js`, `src/server/routes/_shared/compliance/compliance-route-options.js`, and `src/server/routes/_shared/prns/prns-route-options.js` with their tests.

**Confidence:** High for current mechanics; medium for historical and business rationale.
