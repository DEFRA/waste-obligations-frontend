# 0009: Gate analytics tags and cookies by configuration and confirmed consent

**Status:** Accepted—retrospective.

## Context

The service can load Google Tag Manager and/or GA4, creating third-party scripts, cookies, content-security-policy allowances and browser back/forward behaviour. It also runs beneath a path-based proxy.

## Decision

Enable the analytics/cookie-preference feature only when a Google ID is configured. Load GTM/GA tags and retain Google cookies only when the consent policy is both confirmed and analytics-accepted; remove recognised Google cookies when unconfigured, unconfirmed or rejected. Allow Google CSP sources when analytics is configured, not per individual consent, so the configured feature can display its choice UI.

## Rationale basis

**Documented:** [PR #156](https://github.com/DEFRA/waste-obligations-frontend/pull/156) specifies the configuration gate, user accept/reject flow, post-consent tag loading and absence of tags without IDs. Commit `14de24b` explicitly corrected the implementation to avoid injecting tags from an unconfirmed cookie and to persist the choice before loading. **Corroborated:** server, client and journey tests preserve both gates and proxy-aware cookie paths. **Inference:** this is a durable third-party integration boundary; no legal, privacy, DPIA or procurement rationale was found.

## Consequences and evolution

PR #156 (`95c2976`) introduced the feature. Its `14de24b` refinement is current behaviour; `89d6468` aligns GA cookies with the forwarded path. Banner/UI presence is configuration-gated, while tag loading is configuration-and-consent-gated. This distinction prevents an incorrect claim that CSP is consent-gated.

## Evidence

- [PR #156](https://github.com/DEFRA/waste-obligations-frontend/pull/156), commits `95c2976`, `14de24b`, `89d6468`.
- `src/config/cookie-config.js`, `src/config/nunjucks/context/context.js`, `src/server/plugins/cookie-consent.js`, `src/server/plugins/content-security-policy.js`, `src/server/common/templates/layouts/page.njk`, and `integration/journeys/cookies-banner.spec.js`.

**Confidence:** High for current technical behaviour; medium for rationale beyond the stated desired behaviour.
