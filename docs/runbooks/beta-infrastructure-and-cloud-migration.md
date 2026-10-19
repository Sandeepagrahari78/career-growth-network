# CGN-225 Zero-Cost Beta Infrastructure and Cloud Migration

Ticket: CGN-225
Reviewed against main: 85f4a153e5f4a817286fb87a5e1a7ae742805dac
Last checked: 2026-10-20

## Current boundary

CGN's deployment foundation is local-first. The k3d cluster and Compose
dependencies are for development and CI validation. This runbook does not
enable public staging, production traffic, paid cloud services, or a claim of
5,000-user capacity.

The live GitHub repository endpoint reported this repository as public on
2026-10-20. Main was also reported as unprotected. Do not treat source code,
workflow logs, issue links, or repository metadata as private. No repository
visibility setting was changed by this ticket.

## Reproduce the local deployment checks

Use a machine with Docker Engine, Node.js 22, pnpm 11.25.0, k3d 5.9.0,
kubectl, Helm, OpenSSL, and curl. The cluster API and ingress bind to loopback.
No cloud account or cloud credentials are used.

Set a throwaway local PostgreSQL password in the shell before starting the
database. Do not commit it or reuse a production credential. Start the
development dependencies with their existing lifecycle scripts:

~~~powershell
$env:CGN_POSTGRES_PASSWORD = "local-only-password"
node scripts/infra/postgres-local.mjs up
pnpm redpanda:up
pnpm valkey:up
pnpm seaweedfs:up
~~~

Check the services using the commands in the persistence table below, then
start the local cluster and run its ingress and GitOps smokes. When finished,
use each service's down command to stop it while preserving its data. Use reset
only when deliberately deleting that service's local volume.

From the repository root:

~~~bash
pnpm ci:gitops
bash scripts/infra/k3d-up.sh
bash scripts/infra/argocd-staging-smoke.sh
bash scripts/infra/k3d-smoke.sh
bash scripts/infra/k3d-down.sh
~~~

On Windows, the cluster and ingress smoke commands are also available as
PowerShell scripts in scripts/infra. See the [CGN-41 local Kubernetes
runbook](local-k3d-cluster.md). Per-service setup and recovery details are in
the [PostgreSQL](local-postgres.md), [Redpanda](local-redpanda.md),
[Valkey](local-valkey.md), [SeaweedFS](local-seaweedfs.md), and
[local registry](local-registry.md) runbooks. The Argo CD smoke applies only
the approved platform baseline at
infra/k8s/base; it is not a product-service deployment or persistent remote
staging environment.

The Local GitOps Validation workflow runs on matching main pushes or manual
dispatch. A documentation-only pull request does not trigger that runtime
workflow. PR CI still runs the context, quality, and security gates. Record the
exact workflow URL and commit for any manual cluster smoke; do not infer a
runtime pass from static validation.

## Host and resource worksheet

The repository does not define a minimum supported developer-machine size.
Capture the following values when running the local stack; leave them
unmeasured until collected rather than estimating them from CI or the capacity
model.

| Measurement | Current source or value | Host result |
| --- | --- | --- |
| CPU cores and host memory | Capture from the developer host and Docker Engine | Not measured in this session |
| Docker Desktop / Engine memory and disk allocation | Capture from Docker Engine settings | Not measured in this session |
| Local Kubernetes shape | One k3d server and one agent; K3s v1.35.9-k3s1 | Defined; runtime not checked in this session |
| Local Kubernetes API and ingress | 127.0.0.1:6550, 127.0.0.1:8080, 127.0.0.1:8443 | Loopback-only in config |
| Health-demo request / limit | CPU 50m / 500m; memory 64Mi / 256Mi | Defined for health-demo only |
| Redpanda local setting | One CPU and 1G memory; one node | Defined for local smoke only |
| PostgreSQL, Valkey, SeaweedFS Compose caps | No explicit Compose CPU or memory cap | Not bounded by a repository limit |
| 5K beta profile | 5,000 registered users; 250 peak and 500 stress concurrent-session assumptions | Engineering targets, not measured capacity |

The capacity contract uses sustained CPU above 70% or memory above 75% for two
consecutive five-minute windows as scale triggers. These are monitoring
thresholds, not host-size requirements. CGN-284 owns full synthetic-user
load/soak evidence; health-demo and infrastructure smoke results do not prove
real product capacity.

## Persistence, backups, and recovery

Run these existing service checks when Docker is available. Use synthetic data
only. The reset commands deliberately remove the named local service volume;
the down commands preserve it.

| Service | Verify persistence / recovery | Preserve data | Deliberately reset data |
| --- | --- | --- | --- |
| PostgreSQL | node scripts/infra/postgres-local.mjs verify; node scripts/infra/postgres-local.mjs backup-restore-smoke | node scripts/infra/postgres-local.mjs down | node scripts/infra/postgres-local.mjs reset |
| Redpanda | pnpm redpanda:verify; pnpm redpanda:restart-smoke | pnpm redpanda:down | pnpm redpanda:reset |
| Valkey | pnpm valkey:verify; pnpm valkey:restart-smoke | pnpm valkey:down | pnpm valkey:reset |
| SeaweedFS | pnpm seaweedfs:verify; pnpm seaweedfs:restart-smoke | pnpm seaweedfs:down | pnpm seaweedfs:reset |

PostgreSQL's restore smoke verifies a temporary marker in a temporary database
and removes its test objects afterward. SeaweedFS and the message/cache stores
prove local restart persistence; that is not an off-host backup or disaster
recovery guarantee. Store any local dumps under ignored .local/ and never
commit or upload user data.

The release and rollback workflows are owner-only dry runs. Production is not
configured, and no real production rollback has occurred. Follow the
[CGN-227 production-release](production-release.md) and
[rollback](rollback.md) runbooks for the exact-SHA dry-run gates.

Monitoring dashboards and production alerts are not established by this
ticket. The CGN-283 capacity file defines targets; CGN-228 owns SLO alerts.
Do not report live service telemetry or alert coverage until that work is
merged and exercised.

## Secret, repository, and image handling

- Local-only values belong in ignored environment files or shell variables.
- GitHub Actions secrets are injected at job runtime; never print or commit
  secret values.
- Kubernetes Secret examples are limited to local/non-production use. Do not
  commit rendered credentials.
- The repository is currently public according to the live GitHub response.
  Public read access means a read-only Argo CD clone does not need a private
  repository credential. If visibility later changes to private, configure an
  approved read-only runtime credential or GitHub App; do not put it in Git.
- GHCR publishing is conditional on the existing CGN_ENABLE_GHCR repository
  variable being true. This ticket does not change that setting or select a
  paid registry.
- Main currently reports unprotected. Use a ticket branch and PR, wait for
  exact-head checks, and retain Sandeep's review/merge gate. CI audit is not a
  technical substitute for branch protection.

## Provider-neutral migration map

These are future capability matches, not provider selections or approved
provisioning plans. No cloud resources are created by this runbook.

| Current local component | Future managed capability | Migration work still required |
| --- | --- | --- |
| k3d / K3s, Helm, Argo CD | Managed Kubernetes with GitOps | Select a provider only after review; configure private networking, identity, ingress, secrets, storage classes, backup, and cost controls. Keep Helm and approved Kubernetes interfaces portable. |
| PostgreSQL 16 with service-owned databases and roles | Managed PostgreSQL | Preserve per-service database ownership; rehearse encrypted backup/restore and connection rotation; migrate each service's data under its owner-approved plan. |
| Single-node Redpanda | Managed Kafka-compatible event broker | Select retention, replication, authentication, topic ACLs, quotas, and offset migration with the owning event contracts. No product broker is selected here. |
| Disposable Valkey cache | Managed Valkey/Redis-compatible cache | Keep cache data non-canonical; define eviction, TLS, authentication, sizing, and cache warm-up behavior before cutover. |
| SeaweedFS 4.46 S3-compatible local evidence store | Managed S3-compatible object storage | Preserve bucket-scoped access, private objects, retention, encryption, lifecycle, backup, and signed-URL authorization requirements. Jira's older CGN-225 wording names MinIO; the owner confirmed the merged SeaweedFS implementation is the canonical local source for this map on 2026-10-20. |
| Local environment, GitHub Actions secrets, local/non-production Kubernetes Secret | Reviewed managed secret store | Select only after a separate architecture/security review; define rotation, access audit, recovery, and cost. Never migrate secrets through Git. |
| Local Docker registry or optional GHCR publishing | Managed/private OCI registry | Require immutable digest promotion, scanning, SBOM retention, access policy, and explicit cost approval. |

Before any cloud migration, add a dated decision with selected provider/region,
availability and recovery objectives, data residency/retention, network and
identity model, monthly cost estimate, rollback plan, and owner approval. This
runbook makes none of those decisions. CGN-225's zero-cost boundary remains in
force until an explicit approval changes it.

## Current acceptance limits

- Docker Engine was unavailable in the authoring environment, so local
  deployment and service restore smokes were not run for this revision.
- The documentation-only PR does not select the path-filtered Docker or local
  Kubernetes runtime jobs; report only the exact PR CI jobs that actually ran.
- The local host minimum has not been measured or standardized.
- No production host, persistent remote Argo CD, managed secret store, paid
  provider, production backup target, monitoring service, or 5K load result is
  established by this runbook.
