# 0004: Represent direct-producer and compliance-scheme declarations differently

**Status:** Accepted—retrospective.

## Context

Producer certificates and compliance-scheme statements share a declaration API but represent distinct business subjects. The downstream contract needs to distinguish them without inferring meaning from a non-null display field.

## Decision

Build producer declarations with `registrationType: DirectProducer`, the resolved organisation name in `name`, and null `complianceSchemeName` and `schemeOperatorName`. Build CSO statements with `registrationType: ComplianceScheme`, null `name`, the resolved scheme name in `complianceSchemeName`, and the operator organisation name in `schemeOperatorName`. Both retain shared identity, address, reference, regulator and obligation facts; only CSO statements include the Regulation 43 outcome.

## Rationale basis

**Documented:** [PR #102](https://github.com/DEFRA/waste-obligations-frontend/pull/102) records adding registration type when submitting compliance. **Corroborated:** the central payload builders, API schema and exact-shape tests retain mutually distinct, discriminator-led payloads. **Inference:** the required discriminator and null/non-null representation make persisted/downstream interpretation unambiguous. No business or regulatory rationale for the exact field arrangement was found.

## Consequences and evolution

PR #90 introduced the CSO payload shape and later common extraction (`0eacb608`, `70fa673f`). PR #102 (`68eca8b31`) made `registrationType` required at the API boundary. Current declaration views consume the source-specific fields. The schema permits some nullable-field combinations; mapper tests, rather than cross-field schema rules, enforce the intended producer/CSO shape.

This is distinct from ADR 0003: that ADR selects the source name; this ADR determines which declaration field receives it and how the business subject is represented.

## Evidence

- [PR #90](https://github.com/DEFRA/waste-obligations-frontend/pull/90), [PR #102](https://github.com/DEFRA/waste-obligations-frontend/pull/102).
- `src/server/routes/_shared/compliance/compliance-submit/api-payload.js`, `api-payload.test.js`, `src/server/services/schemas/waste-obligations.schemas.js`, producer certificate-submit and CSO statement-submit controllers, and CSO statement-view model.

**Confidence:** High for the current contract shape; medium-low for rationale beyond retained implementation and tests.
