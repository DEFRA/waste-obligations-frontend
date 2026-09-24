# 0002: Preserve actor-specific path identifier semantics

**Status:** Accepted—retrospective.

## Context

Producer and CSO pages both address records through Waste Organisations and Waste Obligations, but their public routes identify different business subjects. Treating every path identifier as an operator organisation ID would make a CSO request address the wrong record.

## Decision

Interpret `/producer/{organisationId}` as the direct producer's organisation-record identifier and `/cso/{schemeId}` as the compliance-scheme-record identifier. Preserve that actor-specific distinction through authorisation, organisation/declaration lookup, obligations, PRNs and status updates. Shared downstream operations may resolve either parameter to one identifier value, but must not replace an ordinary CSO scheme ID with its operator's ID.

The following expected mapping is user-supplied architecture context:

| Public path                  | External RPD identifier meaning        | Must not be reinterpreted as  |
| ---------------------------- | -------------------------------------- | ----------------------------- |
| `/producer/{organisationId}` | The direct producer's RPD organisation | A CSO operator or scheme      |
| `/cso/{schemeId}`            | The CSO's RPD compliance scheme        | The CSO operator organisation |

The frontend must preserve that actor-specific external identifier rather than inventing a frontend-local value. Waste Organisations uses the same source-keyed value as its record URI ID. The RPD provenance is not independently verified here: the inspected integration code only establishes that `PEPRID` becomes the Waste Organisations URI ID for mapped `DP` and `CS` records.

## Rationale basis

**Documented:** [PR #86](https://github.com/DEFRA/waste-obligations-frontend/pull/86) says the CSO organisation lookup was fixed to use `schemeId`. **Corroborated:** frontend route/middleware code carries producer `organisationId` and CSO `schemeId` separately before `resolveComplianceOrganisationId()` deliberately maps either to the downstream identifier. The PRN integration function writes `producer.PEPRID` to the Waste Organisations update URI and maps `DP`/`CS` to `LARGE_PRODUCER`/`COMPLIANCE_SCHEME`. **Inference:** this is a retained public-path and cross-service identity contract, not only route naming.

## Consequences and evolution

Commit `ea31b9e` introduced separate producer and CSO route parameters; PR #86 (`96562e8`) changed CSO downstream lookup from the operator organisation ID to the route scheme ID. Current producer routes match the path against user organisation membership; CSO routes match it against a scheme owned by an enrolled operator. ADR 0001 records those authorisation decisions separately.

There is one explicit compatibility limit: a CSO path containing an operator organisation ID is accepted only when that operator resolves to exactly one scheme. This does not redefine ordinary CSO path semantics, and downstream calls still use the literal path value. The authoritative RPD/Common Data contract and end-to-end identity correlation were not inspected.

## Evidence

- [PR #86](https://github.com/DEFRA/waste-obligations-frontend/pull/86), commit `96562e8`; supporting local history `ea31b9e`, PR #135 and PR #143.
- `src/server/common/routes/middleware/resolve-compliance-organisation-id.js`, `organisation.js`, `src/server/routes/_shared/compliance/_middlewares/current-compliance-scheme.js`, `src/server/routes/_shared/compliance/_middlewares/current-compliance-scheme.test.js`, `src/server/routes/_shared/prns/prn-status-update.js`, and producer/CSO route and journey tests.
- [UpdateWasteOrganisationsFunction](https://github.com/DEFRA/epr-prn-integration-function/blob/main/src/EprPrnIntegration.Api/Functions/UpdateWasteOrganisationsFunction.cs), [WasteOrganisationsApiUpdateRequestMapper](https://github.com/DEFRA/epr-prn-integration-function/blob/main/src/EprPrnIntegration.Common/Mappers/WasteOrganisationsApiUpdateRequestMapper.cs), and [Waste Organisations OrganisationService](https://github.com/DEFRA/waste-organisations/blob/main/src/Api/Services/OrganisationService.cs).

**Confidence:** Medium for frontend/downstream semantics; low for uninspected RPD identifier provenance.
