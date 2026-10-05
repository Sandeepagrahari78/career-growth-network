# 01 - System Map

## Primary domains
Gateway/BFF; Identity & Access; Career Intelligence; Roadmap & Daily Missions; Evidence & Validation; Growth Identity / Growth Graph; AI Career Intelligence / Orchestration; Social Feed & Growth Stories; Social Graph / Connections / Peer Matching; Communities & Discussions; Messaging & Conversations; Cohorts & Squads; Experts & Validation; Opportunities & Matching; Recruiter Discovery; Notifications; Analytics & Engagement; Admin & Operations / Audit Activity Projection.

The machine-readable ownership source is `packages/contracts/architecture/bounded-contexts.v1.json`.

## Canonical synchronization model
- Career/Diagnostic establishes goal, track, readiness and gaps.
- Roadmap consumes Career state and publishes approved task/activity changes through versioned boundaries.
- Evidence verifies work and contributes to skill confidence.
- Growth consumes validated evidence + meaningful activity.
- Canonical `career.activity.v1` projects eligible growth events into Growth, Feed/Stories, Notifications and downstream opportunity projections.
- Social Graph controls follow/connection/block eligibility.
- Communities and Messaging reuse Identity consent plus Social Graph block/connection rules instead of duplicating them.
- Expert validation strengthens Evidence through approved contracts.
- Opportunities consumes Growth/Evidence/track state through owning service boundaries; recruiter visibility is consent-gated.
- Admin uses privacy-safe projections; it is not allowed to bypass domain ownership.
- AI is an internal intelligence/orchestration layer, not a duplicate business source of truth.

## Cross-domain communication
- Immediate cross-domain reads/commands use versioned synchronous API contracts through the owning service.
- Eventual propagation uses versioned domain events wrapped by `domain.event.envelope.v1`.
- Gateway/BFF may compose responses but does not own business-domain truth.
- Detailed API paths and event names are added only by the owning Jira ticket and shared contract.

## Data rule
No service reads another service's database directly.
