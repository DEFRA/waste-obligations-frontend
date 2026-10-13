# 0005: Support direct and path-routed hosting through validated forwarded metadata

**Status:** Accepted—retrospective.

## Context

The frontend is deployed both directly and behind a proxy that exposes it beneath an external path. Browser URLs, cookies and Azure AD B2C callback/logout URLs must therefore reflect the external request without turning every internal route or configured external service URL into a proxy-aware value.

## Decision

Keep application paths local internally. At browser-facing boundaries, derive the external path from one syntactically validated `X-Forwarded-Prefix`; prefix only local rooted URLs and cookie paths. Build authentication callback and relative post-logout URLs from that prefix plus an allowed forwarded/direct host. Preserve absolute URLs. Reject malformed or unallowed authority instead of falling back.

## Rationale basis

**Documented:** [PR #118](https://github.com/DEFRA/waste-obligations-frontend/pull/118) states that the app can be called directly or through a proxy, requiring changed redirects and B2C bootstrapping. [PR #119](https://github.com/DEFRA/waste-obligations-frontend/pull/119) specifies the browser-boundary coverage. [PR #155](https://github.com/DEFRA/waste-obligations-frontend/pull/155) documents the risk that Bell's missing-cookie recovery could direct callback parameters to an arbitrary forwarded host. **Corroborated:** current helpers, server registration and direct/reverse-proxy suites retain the boundary. **Inference:** preserving local controller paths and configured absolute service URLs reduces the proxy contract to the edge rather than distributing it through feature code.

## Consequences and evolution

`forwarded-prefix.js` limits prefixing to local paths; `forwarded-prefix-redirects.js` rewrites local 3xx locations once; Hapi state contextualisation scopes cookies; and `azure-ad-b2c.js` validates the authentication authority. PRs #118 (`63e1d545`, `e3ee0e34`) and #119 (`0d706cb`, `6e00add`, `2d469b`) introduced the boundary. PR #155 (`3bd729a`) replaced intermediate public-origin approaches with the current allowed-host policy. PR #156 (`89d6468`) extends cookie-path handling to analytics.

This relies on trusted ingress: application validation cannot prove that the proxy stripped client-supplied forwarding headers. General `authReturnUrl` validation predates this boundary and is deliberately not claimed as part of this record.

## Evidence

- [PR #118](https://github.com/DEFRA/waste-obligations-frontend/pull/118), [PR #119](https://github.com/DEFRA/waste-obligations-frontend/pull/119), [PR #155](https://github.com/DEFRA/waste-obligations-frontend/pull/155), [PR #156](https://github.com/DEFRA/waste-obligations-frontend/pull/156).
- `src/server/common/helpers/proxy/forwarded-prefix.js`, `src/server/plugins/forwarded-prefix-redirects.js`, `src/server/server.js`, `src/server/auth/azure-ad-b2c.js`, `src/server/auth/authentication-host.js`, `src/server/auth/authentication-host.test.js`, `compose/nginx/integration-proxy.conf`, `playwright.config.js`, and `README.md` (path-based reverse-proxying).

**Confidence:** High for current code and PR rationale; medium for deployed ingress and B2C-registration enforcement.
