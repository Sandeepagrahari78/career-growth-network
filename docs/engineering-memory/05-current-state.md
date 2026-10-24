# 05 - Current Merged State

Last updated: 2026-10-24 after the CGN-134 merge; CGN-90, CGN-99, CGN-75,
CGN-131, CGN-67, CGN-68, CGN-141 and CGN-134 are merged with verification
evidence below.

## Repository

- CGN-288/289: on 2026-10-16, the team-approved _product direction_ expanded to a continuous post-Class-10 Student Ecosystem V2, retaining social-first Home, the existing social/growth loop, and shared web+Android architecture. PR #29 merged Product Vision PRD, 31-Epic gap audit, bounded-context **impact review only**, screen inventory/Stitch design handoff and updated agent-context sources: https://github.com/Sandeepagrahari78/career-growth-network/pull/29 ; merge SHA `6018f3e5c799841e71df1213dcae507a59bf53c9`. There are **no new implemented preparation APIs, Figma frames, exam catalog, database schemas or signed contracts** in that change. Further technical contract decisions [CGN-290](https://sandeepagrahari1.atlassian.net/browse/CGN-290), reviewed UX/Figma frames [CGN-291](https://sandeepagrahari1.atlassian.net/browse/CGN-291), and real pilot user research [CGN-292](https://sandeepagrahari1.atlassian.net/browse/CGN-292) remain pending.
- Shared Engineering Memory and agent synchronization: established.
- CI/CD foundation: established; PR CI, Main CI, Docker Images, Staging Validation, release/rollback dry runs and path-scoped local infrastructure validations are active.
- CGN-75: added the versioned `cgn.skill-catalog.v1` contract, JSON Schema, Career-owned validator and catalog migration rules via [PR #57](https://github.com/Sandeepagrahari78/career-growth-network/pull/57), merge SHA `6432d003bdd898422aca02f525e11e42c7ec9900`. The catalog has no skill rows until CGN-76/77/78 content owners submit reviewed content. Final-head PR CI `39173846216` and Local Helm `39173845995` each passed twice; Main CI `39174420420`, Docker `39174420408`, Local Helm `39174420423`, Staging Validation `39174551457`, and Jira Delivery Sync `39174600303` passed. Jira status is Done. No runtime API, event producer, database or deployment behavior was added.
- CGN-131: added versioned `cgn.product-analytics.v1` event definitions, schema, validator and docs via [PR #59](https://github.com/Sandeepagrahari78/career-growth-network/pull/59), merge SHA `9059703105f92ff6fec960654184c98e6fb26502`. Seven product-funnel names list bounded-context producers, `product_analytics_opt_in`, Analytics as retention owner, and only an approved source-surface property. Identity remains consent authority; no duration or instrumentation is invented. Final-head PR CI `39175494165` and Local Helm `39175494174` each passed twice; Main CI `39175967401`, Docker `39175967416`, Local Helm `39175967435`, Staging Validation `39176139471`, and Jira Delivery Sync `39176139519` passed. Jira status is Done.
- CGN-67: added Identity-owned `cgn.identity.account.v1` and
  `cgn.identity.provider-subject.v1` persistence contracts, schemas, the
  `cgn_identity.identity` migration, and a parameterized transactional
  repository via [PR #67](https://github.com/Sandeepagrahari78/career-growth-network/pull/67),
  merge SHA `6d44d746b585f0f92cb48756fdac8438a5f107fa`. Provider credentials
  remain external; Career/V2 fields, API routes and runtime provider bootstrap
  were not added. PostgreSQL acceptance proved owner isolation, unique provider
  mapping, FK enforcement and rollback. PR CI `39371584997`, Local Helm
  `39371584971`, Main CI `39372850079`, Docker `39372850129`, Local Helm
  `39372850071`, exact-merge Staging Validation `39373071513`, and Jira
  Delivery Sync `39373071566` passed. Jira status is Done.
- CGN-68: added Identity-owned provider-neutral OIDC and token-free session
  contracts, Keycloak 26.8.1 local realm, Authorization Code + PKCE, encrypted
  durable login/session state, versioned Identity auth routes and migration
  002. [PR #70](https://github.com/Sandeepagrahari78/career-growth-network/pull/70)
  merged at SHA `720fec55af251acea528817c239b258f2552df2b`. Exact-head PR CI
  `39384124086` and PR Local Helm `39384124095` passed. Post-merge Main CI
  `39384524683`, Docker Images `39384524833`, Local Helm `39384524859`, exact-
  merge Staging Validation `39384763954`, and final Jira Delivery Sync
  `39384840920` passed. Jira is Done. Real Google credentials and production
  Keycloak deployment remain unverified; no paid service or production
  infrastructure was enabled.
- CGN-39: zero-budget Terraform bootstrap merged via PR #6 / `e9fe0cb945eabe9f4bf86eefd144642455641089`.
- CGN-40: local network/security baseline merged via PR #7 / `42499116c5e2d81552bf206585e3cae04f31ecf9`.
- CGN-41: local k3d/K3s cluster merged via PR #8 / `797fbaf4144cf86919817dc61177870480ead5d9`; PR and post-merge local Kubernetes validation are green.
- CGN-42: local PostgreSQL service-database ownership, migration and backup/restore foundation merged via PR #9 / `f686e47be8209b5c834354383d2212c6f2390094`; post-merge validation is green.
- CGN-32: complete bounded-context ownership and integration-boundary contract merged via PR #10 / `bea4c4330d4b281a82e49c3538077c73decc8ba7`; post-merge validation is green.
- CGN-33: explicit pnpm workspace packages and dependency-boundary enforcement merged via PR #11 / `109ac67dc15d5b2c3bf35a9f3d12b9f204187abb`.
- CGN-227: release/rollback gate hardening merged via PR #13 / `47d719160d9b53ca0fed84cc59795b3bbd9f65f9`; Main CI, Docker Images and Staging Validation are green.
- CGN-92: Argo CD staging GitOps foundation merged via PR #14 / `2dac829a0911ca15cb2572c6cf4960b543209f9b`; PR CI, Main CI, Docker Images, Local Kubernetes Validation and Local GitOps Validation are green.
- CGN-44: reusable microservice Helm base chart merged via PR #16 / `52ece317461db43c05f28106ca3eaf580f236e70`; Main CI, Local Helm, Local Kubernetes, Docker Images and Staging Validation are green.
- CGN-93: immutable Helm staging-to-production promotion merged via PR #18 / `092fb724aa64f58f17f40704ad0dac7e93413fc8`; PR CI, Main CI, Docker, Helm, Kubernetes, GitOps and Staging Validation are green.
- CGN-94: fail-closed service-owned database migration deployment job merged via PR #19 / `f61585d9ee9badf6a710f35ffa747f805bf0606c`; PR CI and Database Migration Validation are green, with post-merge validation running at branch creation time.
- CGN-45: startup/readiness/liveness probe standards merged via PR #20 / `c3a44a3558a5b7b3b628179c509e9bc8033a9377`; PR CI, Main CI, Docker, Local Kubernetes, Local Helm, Helm Promotion and Staging Validation are green.
- CGN-60: HPA/PodDisruptionBudget standards merged via PR #21 / `323a5b814081fdc934c7c6f6f15930929a366d44`; local Helm and Kubernetes validations previously passed.
- CGN-61: dedicated Kubernetes ServiceAccount and opt-in IRSA _configuration pattern only_ merged via PR #22 / `d18093b2e9497709793b764e680109dd0975cbc7`. PR security, unit/contract/quality and local Helm checks passed; no AWS resources created.
- CGN-227 staging recovery regression: ephemeral Docker fault-injection/rollback rehearsal merged via PR #23 / `aefe416acd71084b3d7a2d1fc7ad992cd5616fa1`. PR quality/security and rollback rehearsal passed. No real Kubernetes/GitOps or production rollback happened.
- CGN-285: cross-agent navigation, module guides, optional credential-gated read-only Jira context and simulated Sandeep → Prachi → Tanvi handoff merged via PR #25 / `7de3f7a7943fd97b24aee1b3a5c451b4b0a3f2e1`. PR CI run `38748769481` and local Helm validation run `38748769680` succeeded. Demo is synthetic, not three independently running AI models; a live Jira REST request requires local user credentials.
- CGN-286: ticket-specific platform folder ownership PR gate merged via [PR #27](https://github.com/Sandeepagrahari78/career-growth-network/pull/27), merge SHA `1f969a93862069d9749ede77f14782533a2844b9`. `apps/web/` is Next.js/web; `apps/mobile/` is Expo/Android; the reviewed offline Jira mapping in `config/ci/ticket-platform-scopes.v1.json` enforces the intended app folder against the PR branch. Relevant negative contract tests, PR CI run `38757113673` and local Helm run `38757113415` passed. PR CI does not load live Jira or physically prevent direct main writes. No product UI was created by this ticket.
- CGN-287: Prachi-owned Android Google Play release-readiness CHECKLIST created under CGN-29. No `.aab` has been published, no Play Console account was registered/charged, and no store approval or live Android runtime claim. See `docs/runbooks/android-play-release-checklist.md`.
- Real cloud provisioning and production deployment remain intentionally disabled.

## Infrastructure state

- Terraform uses local state only; no remote backend or cloud provider is enabled.
- Approved local network contract: `cgn.local-network.v1`.
- Pod CIDR: `10.244.0.0/16`; service CIDR: `10.96.0.0/16`.
- Developer Kubernetes API/HTTP/HTTPS bindings are loopback-only.
- Kubernetes namespaces: `cgn-system`, `cgn-apps`, `cgn-data`.
- `cgn-system`, `cgn-apps` and `cgn-data` are deny-by-default; DNS egress is explicitly allowed in each namespace.
- Local Kubernetes runtime: k3d v5.9.0 + K3s v1.35.9-k3s1.
- Local PostgreSQL runtime: PostgreSQL 16 in Docker/Compose, loopback-only.
- CGN-88: local Valkey `9.1.2` Compose service binds `127.0.0.1:16379`, uses optional environment-based authentication and a scoped persistent volume for restart checks. It remains a disposable cache, not canonical domain storage; merged by [PR #51](https://github.com/Sandeepagrahari78/career-growth-network/pull/51) at `61bb85267c7f93e76231e279f5d7c171a2860a6c`.
- CGN-89: pinned SeaweedFS `4.46` `weed mini` local Compose service publishes only S3 on `127.0.0.1:18333`; generated identities keep the initializer separate from bucket-scoped `cgn-evidence` application access, and one named volume preserves filer metadata and objects. Merged by [PR #52](https://github.com/Sandeepagrahari78/career-growth-network/pull/52), merge SHA `f5a7679fdcc0c98db9113e01b0dddd4487bc5600`; PR CI including S3 put/get/head, anonymous denial, bucket isolation and restart persistence passed. This is local development storage, not production availability or backup evidence.
- CGN-90: health-demo staging uses CPU `50m/500m` and memory `64Mi/256Mi` request/limit pairs; the reusable chart schema rejects incomplete pairs. Merged by [PR #53](https://github.com/Sandeepagrahari78/career-growth-network/pull/53) at `f69a621d8e80a9ce87bc440a0fe148602cdd8a2a`. PR CI run `39168887061` and Local Helm run `39168887105` passed on the final PR head; post-merge Main CI run `39169290772`, Docker run `39169290755`, and Local Helm run `39169290756` passed. The short health-demo profile is not 5,000-user capacity proof; CGN-284 owns full load/soak.
- Database ownership contract: `cgn.postgres-databases.v1`.
- Current service databases: identity, career, roadmap, evidence, growth, feed, network, community and messaging.
- Staging GitOps contract: `cgn.staging-gitops.v1`.
- Argo CD namespace/project/ApplicationSet manifests live under `infra/gitops/argocd/`.
- Helm base-chart contract: `cgn.helm-base.v1`; reusable chart lives under `infra/helm/cgn-service/`.
- Helm promotion contract: `cgn.helm-promotion.v1`; staging and production candidates must use the same SHA-tagged artifact.
- Database migration deployment contract: `cgn.database-migration-job.v1`.
- Kubernetes probe contract: `cgn.kubernetes-probes.v1`; health-demo staging and promotion values enable the standard.
- Autoscaling/disruption contract: `cgn.autoscaling-disruption.v1`; HPA targets inherit the approved 70% CPU / 75% memory capacity triggers, while production replica bounds remain evidence-specific.
- Workload identity contract: `cgn.workload-identity.v1`; default dedicated ServiceAccount and token automount disabled; AWS IRSA annotation rendering is opt-in, template-only and requires an approved external IAM resource.
- Product tables and runtime DB roles are not created by infrastructure bootstrap tickets.

## Evidence service state

- CGN-141: Evidence owns the evidence_records PostgreSQL schema and owner-scoped repository. Records keep private visibility, unverified state and opaque object keys; this work added no route, event, scanner or cross-service database access. Merged by [PR #64](https://github.com/Sandeepagrahari78/career-growth-network/pull/64), merge SHA 58deccabc63dd24a885abb5224984e498a3c2cb2; Jira is Done.
- CGN-134: added cgn.evidence-upload-policy.v1 and reusable authorization, post-upload inspection, fail-closed malware scan and clean-scan download gates. The contract allows PDF/JPEG/PNG up to 10 MiB, with 300/60-second URL lifetimes, private quarantine, and revision/checksum pinning. It adds no URL signer, storage integration, production scanner, route or persistence workflow. Merged by [PR #81](https://github.com/Sandeepagrahari78/career-growth-network/pull/81), merge SHA 657afbb146e7014217b9c7ca559249e209f5c742; Jira is Done.
- CGN-142 candidate on branch CGN-142-seaweedfs-20261024: adds the Evidence-owned S3 adapter using the CGN-134 gates and CGN-89 SeaweedFS bucket. Uploads use opaque random quarantine keys, signed owner/type/size/quarantine metadata and a conditional create; server inspection hashes stored bytes and pins the inspected revision; downloads require a clean owner-authorized result and recheck the pinned revision/checksum. This candidate adds no route, event, schema or scanner implementation. Treat it as pending until PR, Main CI and exact-candidate staging evidence are recorded in its handoff.

## Product state

Jira is the work source of truth. Figma defines the approved product flow for user-facing work. Infrastructure work must not invent product schemas, APIs or flows. Cross-domain ownership is frozen by `cgn.bounded-contexts.v1`; detailed APIs/events still require the owning Jira ticket.

## Operational evidence expected for CGN-60

- PR CI: green.
- `pnpm ci:autoscaling`: green.
- Local Helm Validation on the PR: green.
- Invalid utilization target is rejected.
- HPA and PDB render/install in local k3d using the validation-only 2–4 replica profile.
- CPU target: 70%; memory target: 75%.
- PDB `minAvailable: 1`.
- No production replica-count claim is introduced.
- Cloud resources created: none.
- Production deployment performed: none.

## CI/CD completion boundary (2026-10-15)

- PR #22 and PR #23 merged after green required PR checks and explicit founder authorization.
- The staging recovery drill proves an _ephemeral GitHub-runner Docker_ path: healthy /health and /ready → injected HTTP 503 → original known-good image restored → health/readiness/E2E green.
- Main CI automatically revalidates merge SHAs; consult GitHub Actions for the current run conclusions and never infer a completed green run from a queued or active one.
- Green Main CI triggers production-like **ephemeral** staging health/E2E/k6 validation, not a persistent remote staging environment.
- The live GitHub API reports this repository as public and `main` as unprotected (checked 2026-10-20). Repository policy and post-push main auditing are detection/manual controls, not prevention of direct pushes.
- Real production hosting, live GitOps sync, production release/rollback, image attestation and 5,000-user load/soak validation remain unproven and require their own approved tickets.
- Next product delivery: start Jira dependency-ordered Identity / Career Activity / Growth Identity / Social Home implementation. Do not mistake the infrastructure health-demo for completed CGN user journeys.

## CGN-68 Identity OIDC implementation

CGN-68's accepted provider decision is self-hosted Keycloak 26.8.1 for
email/password and optional Google identity brokering. [PR #70](https://github.com/Sandeepagrahari78/career-growth-network/pull/70)
is merged at `720fec55af251acea528817c239b258f2552df2b`. The OIDC config/session
contracts, Identity-owned one-use login transactions, encrypted sessions,
migration 002 and versioned auth routes are on `main`. Exact PR CI, post-merge
Main CI, Docker Images, Local Helm, Staging Validation and Jira Delivery Sync
passed; Jira is Done. Google credentials remain configuration-only, so no live
Google login is claimed. The local Keycloak realm is loopback-only and
development-only. No paid service or production deployment was introduced.
See `docs/handoffs/CGN-68.md` for exact checks and operational limitations.

## Update rule

After each merged PR, record the ticket, PR/merge reference, modules/contracts changed, operational status, risks and exact next dependency.

## CGN-299 delivery automation merged baseline (2026-10-17)

PR #37 merged at `5c803011e9ea30c4cacd82b704d4e3b9859c8c1e`: local ticket launcher and GitHub-to-Jira sync are on main. Main CI 38970986386, Docker 38970986433, Helm 38970986415 and staging 38971322220 passed. Sync 38971322332 ran and left Jira unchanged pending the original owner-comment gate. Local Windows doctor/OAuth/live Jira access and repository secret names were verified by the local agent. No end-to-end automatic Done transition has been observed yet.

Owner authorized a follow-up replacing the comment with owner-reviewed merge approval and exact-candidate staging checks. Treat that change as pending until its own merge/run evidence exists. Human technical/business review before merge remains required; no autonomous merge or production hosting claim.

## CGN-99 zero-cost secrets baseline

Merged by [PR #54](https://github.com/Sandeepagrahari78/career-growth-network/pull/54) at `1f9b1bb0542d89c81ec457146e2890205e82266f`. Local environment files, GitHub Actions encrypted secrets and Kubernetes Secrets for local/non-production use are the documented zero-cost sources. Gitleaks remains fail-closed in PR and main CI. No product runtime, production cluster or paid secret provider was introduced.

Final-head PR CI run `39171230033` and Local Helm run `39171230106` passed on `9ed1e234f2eb39ac1aca79838b16185e47d6507f`. Post-merge Main CI run `39171391072` passed on attempt 3 after two transient PostgreSQL outbox integration failures; Docker run `39171391080`, Local Helm run `39171391102` and Staging Validation run `39171820354` passed. Jira moved CGN-99 to Done after delivery sync.

Kubernetes encryption-at-rest and production secret injection remain unverified; see `docs/handoffs/CGN-99.md`.

## CGN-225 zero-cost infrastructure review (2026-10-20)

- The runbook at `docs/runbooks/beta-infrastructure-and-cloud-migration.md` records the current local-first deployment, known resource settings, persistence checks, cost boundary and provider-neutral migration steps. It does not provision a cloud provider or claim production readiness.
- The live GitHub repository response reports public visibility and an unprotected `main` branch. No visibility setting was changed. Do not treat repository contents or workflow logs as private.
- The migration map uses the merged CGN-89 SeaweedFS implementation as the canonical local object store, per owner clarification on 2026-10-20. Older CGN-225 Jira wording names MinIO and should be aligned separately.
- The local Docker Engine was unavailable during this review. Host minimums, persistent remote Argo CD sync, monitoring/alerts, off-host backups and full 5,000-user capacity remain unverified; see the ticket handoff for exact test evidence.
- Merged by [PR #61](https://github.com/Sandeepagrahari78/career-growth-network/pull/61), merge SHA `6cca89d822384fc05ff48f3baaf379bebcc42ddb` (candidate `4c67954a204918834e8e439649a1c355bad3ca12`). Exact-head PR CI run `39319090946`, PR Jira Delivery Sync run `39319090674`, post-merge Main CI `39319375711`, Docker Images `39319375703`, Staging Validation `39319656875`, and Jira Delivery Sync `39319656877` / `39319747453` passed.
- Jira CGN-225 remains In Review because local host-level backup/restore and monitoring acceptance is not demonstrated. Delivery automation briefly moved it to Done after merge; the status was returned to In Review on 2026-10-20. CGN-226, CGN-229 and CGN-261 remain downstream.

## CGN-69 Identity application roles and authorization context

CGN-69 adds Identity-owned global application role assignments for `student`,
`expert`, `recruiter` and `admin`, plus the versioned
`cgn.identity.authorization-context.v1` response at
`GET /v1/identity/auth/authorization-context`. Identity resolves the account
from the authenticated session and returns only recognized active roles;
provider/client claims are ignored and there is no implicit new-account role.
Role changes are transactional and audited.

Merged by [PR #72](https://github.com/Sandeepagrahari78/career-growth-network/pull/72)
at `024547534c5303b225a3ceb7fe1126350f253f86` (candidate
`bd715a45221a43c2366dc0f93165759980b317ad`). Exact-head PR CI run
`39389167803` attempt 2 and PR Local Helm run `39389167996` passed.
Post-merge Main CI `39389902415`, Docker Images `39389902434`, Local Helm
`39389902408`, exact-merge Staging Validation `39390163488`, and final Jira
Delivery Sync `39390226412` passed. Jira is Done. The first PR CI attempt
encountered the existing transient platform-template PostgreSQL startup race;
the failed job passed on rerun. No live Google roles, production deployment,
or paid infrastructure was introduced.

Recruiter role does not imply approved organization membership (CGN-102), expert
does not imply verified expertise (CGN-186), and admin does not grant delegated
Admin/Operator permissions or privacy-safe visibility (CGN-279). No role-write
HTTP route or service-to-service authentication is defined by this ticket. See
`docs/handoffs/CGN-69.md` for tests, exact workflow evidence and rollback.

## CGN-95 OpenTelemetry SDK (PR pending)

- Candidate implementation adds `@cgn/observability` with W3C Trace Context propagation, asynchronous OTLP/HTTP export, HTTP request spans, and reusable database/Kafka span helpers. `services/platform-template` initializes it from `OTEL_SERVICE_NAME` and `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` and shuts it down with Nest lifecycle hooks.
- The implementation intentionally does not add database or Kafka driver instrumentation, a collector, or a contract. Export is disabled when no endpoint is configured; spans omit URLs, request/event bodies, credentials, database statements and user identifiers.
- Jira CGN-95 hard prerequisites CGN-35 and CGN-36 are Done. Jira CGN-95 remains In Review until delivery review and automation complete. See `docs/handoffs/CGN-95.md` for checks and limitations.
