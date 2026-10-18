# CGN V1 trust boundaries, threat model and security acceptance checklist

- Ticket: CGN-66 — Define threat model trust boundaries and security acceptance checklist
- Review status: Draft for Sandeep security review
- Baseline inspected: `main` at `d05d47df8c7e0877727c02d0ae1fe9d2eaa31a91` (2026-10-18)
- Scope: architecture and verification guidance for CGN V1; no runtime security control is added here.

This document is a threat-model baseline for the approved ownership model. A
mitigation below is a requirement for the owning implementation, not evidence
that a product API, service, file pipeline, AI integration, or admin console
already exists or is secure. Product services remain workspace skeletons on
the inspected `main` unless an owning merged ticket proves otherwise.

## System context and trust boundaries

Identity owns account, role, authentication and consent truth. Social Graph
owns connections and block truth. Domain services own their own data. Gateway
composes client requests but cannot become business truth. Events and
projections carry data across boundaries; they never grant access the owning
service would deny. AI remains an internal orchestration layer. Admin receives
allow-listed privacy-safe projections.

| Boundary | Data crossing it | Main trust change | Required control |
|---|---|---|---|
| Web / Android client → Gateway | Credentials or session proof, user input, request metadata | User-controlled device and network become server input | Authenticate at the server; validate every request; do not trust client-side authorization, hidden fields, storage or identity headers. |
| Gateway → owning service API | User identity/role context and scoped command/query | Edge composition becomes a domain-owned decision | Use the versioned API of the owning service; verify caller and resource authorization there; prevent confused-deputy forwarding and identity-context substitution. |
| Service → service-owned database | Domain records, consent/visibility state, access metadata | Application logic reaches persistent high-value data | Keep one database owner per domain; parameterize queries; use least-privilege service credentials; do not read another service database. |
| Service → event transport → consumer projection | Versioned event envelope and minimum needed payload | Producer-controlled message crosses an asynchronous boundary and may be replayed or delayed | Validate the registered schema and producer; minimize payload; deduplicate by stable event ID; handle replay, delay and deletion/correction without treating a projection as permission. |
| User → file/object storage | Private evidence or other uploaded content | Untrusted bytes cross into a durable object boundary | Authorize each upload/download; constrain size/type; inspect actual content; isolate objects; use narrow, expiring access; scan before any approved downstream use. |
| CGN orchestration → external AI provider | Only data explicitly authorized for the task | CGN-controlled data crosses to a third party | Minimize and de-identify where possible; never send credentials or unrelated private content; enforce provider and retention terms before enabling; validate output before use. |
| Owning services → Admin projection | Operational and audit fields | Restricted domain data becomes visible to a privileged operator | Enforce role and purpose; expose an explicit field allow-list; audit access/actions; omit private message bodies, private evidence files, credentials/tokens and AI conversation history. |

These boundaries describe where future controls must be verified. The
architecture diagram and contracts describe ownership intent, not deployed
endpoints or network paths.

## Assets and security objectives

| Asset | Owner / sensitivity | Security objective |
|---|---|---|
| Account identifiers, credentials, sessions and access tokens | Identity; highly sensitive | Prevent account takeover, impersonation, disclosure and replay. Never expose secrets in logs, errors, URLs or client-readable projections. |
| Role, age/stage, consent and privacy choices | Identity; highly sensitive | Preserve the owning decision, enforce it at every server-side read/write, and stop disclosure after revocation. Do not infer consent from account existence or a client toggle. |
| Connections, blocks and contact eligibility | Social Graph; sensitive | A block or ineligible relationship must deny interaction consistently across APIs and projections. |
| Career plans, activity, readiness and evidence metadata | Owning domain; sensitive | Preserve private-by-default behavior where specified; expose only user-authorized fields and purposes. |
| Private evidence files and upload metadata | Evidence owner; highly sensitive | Prevent cross-user access, public leakage, malicious-content execution and access after revocation/deletion. |
| Messages and conversations | Messaging; highly sensitive | Keep message content under Messaging ownership; apply Social Graph eligibility; do not copy bodies into default Admin or AI projections. |
| Events, feed/story/notification/search/admin projections | Producer owns event truth; consumers own projections | Minimize replicated data; preserve source visibility, consent, block and deletion decisions; tolerate stale state without granting access. |
| AI prompts, context and generated output | CGN and provider; potentially sensitive | Send only authorized minimum context; prevent cross-user context leakage and unsafe or unauthorized output use. |
| Audit and operational logs | Producing service; sensitive metadata | Support investigation with safe identifiers while excluding credentials, tokens, private content and unnecessary personal data. |

For minors, preserve the approved restrictive defaults: marks, personal
timetable and study hours are not exposed by default; peer progress is
user-controlled; direct adult/minor mentorship contact requires its separate
safety and policy review. This checklist does not define a new consent model,
age-verification process or legal determination.

## Threats, mitigations and verification cases

| Area | Threat / attack path | Required mitigation | Verifiable acceptance case |
|---|---|---|---|
| Identity and consent | Credential stuffing, stolen/replayed session, role escalation, or consent state bypassed through a client-supplied flag | Identity authenticates and authorizes server-side; sensitive actions re-check current role and consent; secrets use approved secret storage and never enter source/logs | Unauthenticated, expired and wrong-role requests fail closed. Missing or revoked consent cannot read, write or share the protected data. No credential or token appears in logs, URLs or error bodies. |
| Minors and privacy defaults | Client, export or projection reveals marks, personal timetable/study hours, or permits unreviewed adult contact | Apply approved age/stage and private defaults at the owning service and every projection; enforce the separate reviewed contact policy before enabling mentorship | A minor test account does not expose marks, personal timetable or study hours by default. An unapproved adult/minor contact path is denied. A downstream projection cannot widen source visibility. |
| Web and Android clients | Modified client bypasses UI checks, tampers with user/resource IDs, leaks tokens through storage, deep links or diagnostics | Treat every device as untrusted; server-authorize each resource; protect credential storage and redirect/deep-link handling under the approved client design; redact diagnostics | A direct API call with altered user/resource/role values is denied. A signed-out or expired session cannot reach a private resource. Security checks do not depend on hiding a client control. |
| Gateway / BFF | Confused deputy, spoofed forwarded identity, over-broad composition, request smuggling or sensitive data in access logs | Validate the trusted identity source; allow-list forwarded headers; apply request size/time bounds; route through owning versioned APIs; redact logs | Caller-controlled identity headers cannot impersonate another user. A caller lacking permission cannot obtain data through a composed route. Logs omit tokens, bodies, query values and sensitive headers. |
| Owning services and databases | Broken object-level authorization, injection, tenant/user isolation failure, or direct cross-service database shortcut | Check authorization against the owning domain's current records; validate inputs; parameterize database operations; use per-service database access and least privilege | Negative tests cover another user's object, invalid/oversized input and wrong role. A service can access only its own database; cross-domain access uses the approved versioned API/event boundary. |
| Events and projections | Forged or malformed event, replay/duplicate, delayed consent/block/delete update, or projection leakage | Validate the versioned envelope and event type; authenticate producer; minimize payload; deduplicate stable IDs; apply correction/removal; make the source service authoritative for access decisions | Invalid schema/producer is rejected. Replaying the same event does not create duplicate effects. A stale feed, story, notification, search or Admin projection cannot reveal content denied by current source consent/block/deletion state. |
| Files and evidence | Malicious/polyglot upload, oversized file, guessed object key, reusable URL, or access after deletion | Authorize owner and purpose; cap size; check actual content rather than filename alone; isolate storage; issue short-lived narrowly scoped links; scan before approved processing; revoke/remove references on deletion | Wrong-user and expired-link downloads fail. Oversized/disallowed content is rejected. A blocked or deleted file is unavailable through direct URL and all projections. Malware scanning is required before any future feature claims a file safe. |
| AI provider boundary | Prompt injection, cross-user context mix-up, disclosure to provider, or generated output treated as trusted domain truth | Send only minimum authorized context; isolate per-user context; do not send credentials, private message bodies or unrelated evidence by default; constrain and validate output; keep human control and domain ownership | A test prompt cannot retrieve another user's context or secrets. Provider-bound payload inspection contains only the task-authorized allow-list. Output cannot mutate source truth or trigger an action without the owning authorization path. |
| Admin / operations | Privileged misuse, broad export, or a projection includes raw messages/files/secrets/AI history | Least-privilege role and purpose checks; explicit safe-field allow-list; audited reads/actions; no default raw content or bulk export | A low-privilege operator is denied. The Admin projection test asserts private message bodies, private evidence files, credentials/tokens and AI conversation history are absent. Access/action audit entries contain safe identifiers only. |
| Telemetry and errors | Tokens, personal data, request bodies or provider/database exceptions leak through diagnostics | Structured allow-listed fields; request IDs for correlation; safe error codes/messages; no raw exception, payload, URL/query or authorization header | Seed token and private-content sentinels into a request and provider/database error; assert none appear in logs, metrics, traces or response body while the safe request ID remains usable. |

The event and file controls above are design-time acceptance requirements. The
current `main` does not establish a production event pipeline or file service;
do not treat this table as proof that either exists.

## Security acceptance checklist for implementing tickets

For each feature that crosses one of these boundaries, link the relevant
checklist items in its PR and attach automated or reviewable evidence:

- [ ] Identify the source-of-truth owner, data classification, caller and exact trust boundary; use only existing approved contracts.
- [ ] Enforce authentication, role, object-level authorization and current consent in the owning service, including negative-path tests.
- [ ] Verify block, privacy, deletion and revocation behavior in every consumer/projection; stale projections never grant access.
- [ ] Verify minor restrictive defaults and reviewed adult/minor contact policy where age or contact is involved.
- [ ] Validate inputs and versioned API/event schemas; test malformed, oversized, replayed, duplicate and wrong-owner requests as applicable.
- [ ] Prove credentials, tokens, private messages/files, AI context and raw exceptions do not leak through logs, errors, analytics or Admin.
- [ ] For files, test ownership, type/size limits, expiring scoped links, malware-scan gating and deletion/revocation behavior before enabling processing.
- [ ] For AI, inspect provider-bound fields, isolate users, validate output and show that provider output cannot bypass owning-service authorization.
- [ ] For Admin, test role/purpose denial, the field allow-list, safe audit records and absence of excluded private data.
- [ ] Run the repository's fail-closed Gitleaks, OSV, Semgrep and Trivy gates; exceptions require a Jira ticket, Sandeep review and expiry.
- [ ] Record residual risks and downstream owners in the ticket handoff. Keep paid services disabled unless explicitly approved.

## Residual risks and review boundary

- The inspected repository has no verified production Identity API, product
  Gateway, domain service runtime, file upload pipeline, AI provider integration
  or Admin console. Their controls require owner-specific design, implementation
  and tests.
- No penetration test, red-team exercise, production data-flow inventory or
  incident-response rehearsal is claimed by this document.
- Applicable child/data-protection legal requirements and mentor eligibility
  need the separate product, privacy and legal review identified by approved
  product direction; this threat model is not legal advice or that review.
- Security review by Sandeep is required before this baseline is treated as
  approved. No human review or acceptance is implied by PR creation or green CI.

## Source references

- [CGN bounded-context map](../architecture/bounded-context-map.md)
- [Identity ownership guide](../modules/identity.md)
- [Approved CGN V2 privacy and minor-safety direction](../product/CGN_V2_PRODUCT_VISION.md)
- [Security gates runbook](../runbooks/security-gates.md)
- [Security gate policy](../../config/security/security-policy.v1.json)
- [CGN-32 ownership ADR](../adr/ADR-0004-bounded-context-ownership.md)
- [Versioned bounded-context contract](../../packages/contracts/architecture/bounded-contexts.v1.json)

