# 01 - System Map

## Primary domains
Gateway/BFF; Identity & Access; Career Intelligence; Roadmap & Daily Missions; Evidence & Validation; Growth Identity; AI Orchestration; Social Feed & Stories; Social Graph; Communities; Messaging; Cohorts; Experts; Opportunities; Recruiter Discovery; Notifications; Admin & Operations; Analytics.

## Canonical synchronization model
- Career/Diagnostic establishes goal, track, readiness and gaps.
- Roadmap consumes Career state and publishes task lifecycle events.
- Evidence verifies work and contributes to skill confidence.
- Growth consumes validated evidence + meaningful activity.
- Canonical Career Activity projects eligible growth events into Feed/Stories/Notifications.
- Social Graph controls follow/connection/block eligibility.
- Communities and Messaging reuse identity/privacy/block rules.
- Expert validation strengthens Evidence through deterministic rules.
- Opportunities consume Growth/Evidence/track state; recruiter visibility is consent-gated.
- Admin uses privacy-safe projections; it is not allowed to bypass domain ownership.

## Data rule
No service reads another service's database directly.
