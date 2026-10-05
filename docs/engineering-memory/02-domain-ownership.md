# 02 - Domain Ownership

The machine-readable source of truth is `packages/contracts/architecture/bounded-contexts.v1.json`.

| Domain | Owns | Must not own |
|---|---|---|
| Gateway/BFF | edge request composition, request routing | business-domain source truth |
| Identity & Access | account, auth, roles, consent | career scoring |
| Career Intelligence | career goals, tracks, diagnostics, skills | social graph |
| Roadmap & Daily Missions | plans, milestones, daily missions | evidence truth |
| Evidence & Validation | proof, provenance, confidence | public feed ranking |
| Growth Identity / Growth Graph | longitudinal skill/readiness state | raw auth data |
| AI Career Intelligence / Orchestration | provider and recommendation orchestration | canonical business-domain source truth |
| Social Feed & Growth Stories | projections, ranking | source-domain truth |
| Social Graph / Connections / Peer Matching | follow, connection, block | message contents |
| Communities & Discussions | membership, discussions, moderation metadata | identity source truth |
| Messaging & Conversations | conversations, messages, read state | connection/block policy source truth |
| Cohorts & Squads | cohort/squad coordination state | identity or career source truth |
| Experts & Validation | expert profile/session/validation workflow | raw evidence truth |
| Opportunities & Matching | catalog, match results | recruiter consent source truth |
| Recruiter Discovery | org approval, candidate search, saved candidates | private profile source truth |
| Notifications | delivery projections | upstream business-domain source truth |
| Analytics & Engagement | metrics, events, aggregates | business-domain source truth |
| Admin & Operations / Audit Activity Projection | privacy-safe operational/audit projections | private message bodies, private evidence files, credentials/tokens, AI conversation history |

## Social policy ownership
- Identity owns consent.
- Social Graph owns follow/connection/block truth.
- Communities owns community membership and discussion/moderation metadata.
- Messaging owns conversation state and consumes Social Graph eligibility.
- Feed/Stories, Notifications and Admin are projections and must not override privacy, block, deletion or consent state from the owning domain.

Human ownership may vary by ticket. Architecture/security/data-contract decisions require Sandeep review.
