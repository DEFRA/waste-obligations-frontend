# Retrospective architecture decisions

Assessed against the current checkout on **23 September 2026**. “Accepted—retrospective” records an evidenced, retained implementation; it does not assert that the decision received a contemporaneous ADR approval.

The format and accountability approach take [waste-obligations PR #265](https://github.com/DEFRA/waste-obligations/pull/265) as an example only. That open backend PR contains no frontend implementation evidence; every record below cites this repository's history and current code.

| ADR                                                              | Decision                                                                      |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| [0001](0001-producer-and-cso-authorisation.md)                   | Authorise producer and CSO routes using current associations and action roles |
| [0002](0002-actor-specific-path-identifier-contract.md)          | Preserve actor-specific path identifier semantics                             |
| [0003](0003-registration-aware-organisation-name.md)             | Select organisation names from the relevant registration                      |
| [0004](0004-registration-specific-declaration-representation.md) | Represent producer and scheme declarations differently                        |
| [0005](0005-path-routed-hosting-boundary.md)                     | Support direct and path-routed hosting through validated forwarded metadata   |
| [0006](0006-shared-downstream-http-client-boundary.md)           | Keep shared outbound HTTP policy in a constrained client boundary             |
| [0007](0007-production-response-validation-tolerance.md)         | Continue production requests after failed downstream response validation      |
| [0008](0008-production-application-error-sanitisation.md)        | Sanitise application-error logs in production                                 |
| [0009](0009-consent-gated-analytics.md)                          | Gate analytics tags and cookies by configuration and confirmed consent        |
| [0010](0010-immutable-ci-inputs-and-release-permissions.md)      | Pin top-level CI inputs and isolate release permissions                       |

Each record separates documented rationale from corroboration and inference. The [PR coverage record](pr-coverage.md) records the complete reachable merge index, exclusions, and evidence limits.

## Confidence gaps and open questions

- Account Service is the authority for producer membership, operator-to-scheme association and current role, but its external contract does not explain the CSO single-scheme fallback, basic-user view policy, or outage presentation.
- The stated RPD origin of direct-producer and CSO path identifiers is supported by the supplied architecture context. The inspected integration code corroborates only `PEPRID` propagation into Waste Organisations; an authoritative RPD/Common Data contract remains to be linked.
- The name-selection policy has retained source/type and fallback rules, but does not prove a business rationale for its exact registration ordering; key multiple-registration and unknown-type cases lack focused tests.
- Declaration payload tests, rather than cross-field API-schema rules, enforce the intended direct-producer/CSO null/non-null representation.
- The application validates forwarding metadata, but the ingress contract that removes client-supplied forwarding headers and deployed Azure callback registrations were not inspected.
- There is no recorded rationale for preferring production continuity over data-integrity failure when a downstream response fails schema validation; malformed data can reach callers and may be cached on schema-bearing GET paths.
- `logApplicationError()` is a retained convention, not an enforcement mechanism. Existing raw-error-capable paths need a separate audit before claiming all production logging is free of personal data.
- Analytics history establishes desired technical behaviour, not legal, privacy, DPIA, or procurement rationale, nor which deployed environments configure Google IDs.
- The CI record covers inspected top-level actions, Compose images and repository permissions. It does not establish immutable Docker base images, immutable nested composite-action references, repository settings, or a secret-free CI boundary.
