# CGN Security Gates Runbook

Ticket: **CGN-91**

CGN uses free, automated DevSecOps gates before code is merged or a container image is promoted.

## Security layers

PR and scheduled security checks cover:

- Gitleaks for secrets
- OSV-Scanner for known dependency vulnerabilities
- Semgrep CE for static security findings
- Trivy filesystem scanning for repository/IaC/dependency findings
- Trivy image scanning for built containers
- CycloneDX SBOM generation for every Docker image built by the security-aware pipeline

The machine-readable policy is:

`config/security/security-policy.v1.json`

## Fail-closed behavior

A failing security scanner does not get converted to green by weakening rules.

For PR source scans, all scanners are allowed to finish so the developer receives the complete finding set. A final aggregate security gate then fails the job if any required scanner failed.

For container builds, the image may still complete its smoke check after a vulnerability finding so diagnostics are complete, but the final container-security gate fails the job.

## Dependency vulnerability response

When OSV reports a vulnerability:

1. identify the package and vulnerable version;
2. upgrade, replace or remove the dependency when a fixed version exists;
3. rerun the full PR pipeline;
4. if no safe upgrade exists, create a Jira risk/exception ticket instead of silently suppressing the finding;
5. any exception requires Sandeep review and an expiry date.

## Secret response

When Gitleaks reports a secret:

1. remove the secret from code/config/history as appropriate;
2. rotate or revoke the credential if it may have been exposed;
3. use GitHub/environment secret storage rather than repository plaintext;
4. rerun CI.

A secret finding must never be allowlisted only to make CI green.

## Container vulnerability response

Container images fail the gate on fixable HIGH or CRITICAL findings under the current policy.

The preferred remediation order is:

1. update the base image;
2. update vulnerable OS/application packages;
3. remove unnecessary packages from the runtime image;
4. rebuild and rescan the exact image;
5. document a temporary exception only when there is no reasonable fix.

## SBOM

Each CI-built Docker image produces a CycloneDX JSON SBOM artifact retained for 14 days.

The SBOM is evidence of what components were present in the scanned image. Deployment promotion must use immutable SHA-tagged images.

## Scheduled rescans

The scheduled security workflow runs weekly because a dependency or base image can become vulnerable even when the repository has not changed.

The scheduled workflow rescans:

- repository dependencies/source;
- all Docker-capable services;
- fresh SBOMs for those images.

## Zero-budget rule

No paid security service, hosted registry, managed scanner or cloud security product may be enabled without explicit Sandeep approval.
