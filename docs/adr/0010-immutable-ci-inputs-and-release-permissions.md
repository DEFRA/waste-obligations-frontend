# 0010: Pin top-level CI inputs and isolate release permissions

**Status:** Accepted—retrospective.

## Context

Mutable GitHub Action and Compose-image references can change without a repository commit. Publish workflows previously gave write capability to test steps.

## Decision

Pin inspected top-level GitHub Actions to full commit SHAs and Compose images to digests. Run release validation with read-only repository access and no persisted checkout credential, then grant `contents: write` and `id-token: write` only to a separate publish job that depends on validation and Sonar completion.

## Rationale basis

**Documented:** [PR #161](https://github.com/DEFRA/waste-obligations-frontend/pull/161) identifies mutable inputs and write permission on test steps, and explicitly selects immutable references and a separate publish runner. **Corroborated:** the checked-in workflows and Compose files retain the boundary. **Inference:** these controls reduce supply-chain and capability risk within their stated scope; they do not establish a complete untrusted-code or secret-isolation boundary.

## Consequences and evolution

PR #161 (`7e12a44`, `00b73ab`, `cbb6ef3`, `a79b4d5`; merge `565fe88`) introduced action/image pinning, separate publish jobs and Dependabot coverage. The record intentionally excludes mutable Docker base-image tags, nested references within composite actions, repository/OIDC settings, and secret-bearing Sonar/journey jobs. No merged descendant changes the inspected permission or pinning boundary.

## Evidence

- [PR #161](https://github.com/DEFRA/waste-obligations-frontend/pull/161).
- `.github/workflows/check-pull-request.yml`, `.github/workflows/publish.yml`, `.github/workflows/publish-hotfix.yml`, `.github/workflows/sonarcloud.yml`, `.github/dependabot.yml`, `compose.yml`, `compose.integration.yml`, `compose/journey-tests.compose.yml`, and `Dockerfile`.

**Confidence:** High for the retained configuration and stated scope; medium for broader security effect.
