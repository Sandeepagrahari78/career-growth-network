# 03 - Contract Registry

All cross-domain contracts live under `packages/contracts` unless a ticket deliberately creates a machine-readable infrastructure contract under `config/`.

## Canonical contracts

- `cgn.bounded-contexts.v1` — cross-domain ownership and integration-boundary contract.
- `cgn.workspace-boundaries.v1` — monorepo package roots and allowed workspace dependency direction.
- `cgn.staging-gitops.v1` — zero-budget local-first Argo CD staging GitOps source, destination and safety contract.
- `cgn.helm-base.v1` — reusable microservice Helm base-chart scope and safety contract.
- `cgn.kubernetes-probes.v1` — startup/readiness/liveness HTTP probe defaults, failure behavior and observability contract.
- `cgn.autoscaling-disruption.v1` — HPA utilization targets, replica-bound evidence rule, PDB baseline and Kubernetes observability contract.
- `cgn.helm-promotion.v1` — immutable staging-to-production values promotion and owner-approval contract.
- `cgn.database-migration-job.v1` — service-owned database migration sequencing, backup, evidence and fail-closed deployment contract.
- `career.activity.v1` — canonical eligible career-growth activity.
- `cgn.skill-catalog.v1` — immutable Career skill IDs, aliases, lifecycle and replacement metadata; track curricula reference this catalog.
- `cgn.product-analytics.v1` — versioned product-funnel event dictionary with producer, opt-in consent class, Analytics retention owner and payload allow-lists.
- `domain.event.envelope.v1` — common versioned event envelope.
- `http.error-envelope.v1` — common synchronous error shape.

`domain.event.envelope.v1` requires event ID, event type, envelope version, RFC 3339 occurrence timestamp, producer, and payload. Version 1 consumers reject other envelope versions; unknown optional envelope properties remain additive-compatible. The canonical TypeScript interface and JSON Schema live in `packages/contracts/src/events/domain-event-envelope.v1.ts` and `packages/contracts/schemas/domain-event-envelope.v1.schema.json`. Domain-specific payloads remain owned by their producer contracts.

Synchronous HTTP APIs use URL major versions (`/v1/...`); additive changes retain a major path and breaking changes require an explicitly migrated major path. See [synchronous API versioning and error policy](../contracts/synchronous-api-versioning.md). Contract response fixtures live in `packages/contracts/fixtures/http/` and are exercised by shared contract and platform-template HTTP integration tests.

## Contract change policy

1. Prefer additive, backward-compatible changes.
2. Version breaking changes.
3. Update producer and consumer tests.
4. Update this registry and handoff note.
5. Do not silently change field meaning.
6. Do not change domain ownership without architecture/security review.

## Bounded contexts

`packages/contracts/architecture/bounded-contexts.v1.json` freezes the CGN service ownership matrix, synchronous-vs-asynchronous boundary rules, social policy ownership and projection privacy rules.

Detailed endpoint paths and new event names are intentionally not invented by the architecture contract. They are added by the owning Jira ticket and must be versioned here before cross-domain use.

## Staging GitOps

`config/gitops/staging-gitops.v1.json` defines the approved Argo CD staging GitOps boundary for the zero-budget/local-first phase.

It currently allows only `infra/k8s/base` as the GitOps source path and requires no cloud provider, no committed repository credential, no production auto-deploy and manual production release control.

## Helm Base Chart

`config/kubernetes/helm-base.v1.json` defines the reusable Helm chart boundary for established service workspaces. CGN-44 owns the base Deployment/Service shape only; probes, HPA/PDB and service-account/IAM standards remain with CGN-45, CGN-60 and CGN-61.

## Helm Promotion

`config/gitops/helm-promotion.v1.json` extends the CGN-44 reusable chart without creating a second chart. It requires one immutable SHA-tagged artifact across staging and production candidates, owner approval, and render-only production intent until a real target is separately approved.

## Database Migration Job

`config/deployment/database-migration-job.v1.json` defines the deployment migration sequence. It reuses the CGN-42 database ownership contract, requires a pre-migration backup and restore proof, executes one service migration under its owner role, stores redacted evidence only, and does not define product schemas.

## Kubernetes Probes

`config/kubernetes/probes.v1.json` defines CGN-45 probe behavior for the reusable Helm chart. Health-demo enables the standard in staging and promotion values; generic service defaults remain disabled until the owning service exposes compatible health endpoints.

## Autoscaling and Disruption

`config/kubernetes/autoscaling-disruption.v1.json` binds HPA CPU/memory targets to the approved `cgn.capacity.v1` thresholds. Generic autoscaling remains disabled and replica bounds require service/load evidence; the local smoke profile exists only to validate HPA/PDB wiring.

## Career Activity

One meaningful career action can update Growth, Feed, Stories, Notifications and downstream opportunity projections. Do not create mobile-only or feature-specific copies of the activity model.
