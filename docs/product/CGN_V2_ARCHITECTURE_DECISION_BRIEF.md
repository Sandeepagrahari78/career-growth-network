> **Document precedence:** **Supporting technical-question list**, not an approved contract. Canonical scope analysis is [CGN_V2_ARCHITECTURE_REVIEW.md](CGN_V2_ARCHITECTURE_REVIEW.md). [CGN-290](https://sandeepagrahari1.atlassian.net/browse/CGN-290) owns the future ADR and contract decision.

# CGN V2 — Architecture / Contract Design Review Brief

**Document class:** RFC questions and recommended boundaries, **not an approved product API schema**.  
**Strategy approved:** Student Ecosystem V2 vision, as reported by user 2026-10-16.  
**No contract / service / DB changes in this document.** Existing authority: [\`cgn.bounded-contexts.v1\`](../../packages/contracts/architecture/bounded-contexts.v1.json), [\`career.activity.v1\`](../engineering-memory/03-contract-registry.md), [\`AGENTS.md\`](../../AGENTS.md).  
**Review:** Sandeep / owning-service authors, Prachi web/mobile, Tanvi moderation/QA.

## A. Existing architecture stays intact

\`\`\`mermaid
flowchart TD
  WEB["Next.js web (shell)"] --> GW["Gateway/BFF boundary"]
  AND["Expo Android (shell)"] --> GW
  GW -. "Future versioned API" .-> ID["Identity: account & consent"]
  GW -. "Future versioned API" .-> CA["Career: goals, tracks, diagnostics"]
  GW -. "Future versioned API" .-> RD["Roadmap: plans & actions"]
  CA -. "Approved read / event" .-> G["Growth: progress over time"]
  RD -. "Approved activity" .-> G
  G -. "Permission checked projections" .-> FEED["Feed / Growth Stories"]
  CA -. "Relevant match inputs" .-> SOCIAL["Social Graph: connection / block"]
  SOCIAL -. "Eligibility" .-> MSG["Messaging & Communities"]
  ID -. "Consent restrictions" .-> MSG
  ID -. "Consent restrictions" .-> FEED
  EXP["Experts: verified mentor state"] -. "Approved validation" .-> G
\`\`\`

Dashed arrows are proposed integration intents; they are **not proof of current running APIs/events**. Product apps and most service folders in main are skeletons; do not build a new \`services/journey\` or \`services/preparation\` merely from this diagram.

## B. Bounded-context proposals: explicit decision table

| Question | Preferred starting hypothesis | Alternative / concern | Required decision |
| --- | --- | --- | --- |
| Who owns evolving education stage, selected exam and concurrent goals? | Extend **Career** track/goal bounded context | New Journey domain might be warranted with future evidence, but risks duplication | Sandeep + Career owner |
| Is age/guardian consent an education field? | **No**; Identity owns age/consent authorization, exposing only minimal necessary eligibility | Putting raw birth date in many services leaks sensitive data | Identity/Security |
| Who owns exam syllabus/catalog editions? | Career ontology plus an Admin-governed reference catalog; ownership split needs explicit spec | New catalog service adds operational cost and schema duplication | Career/Admin |
| Who owns timetable/revisions/mocks? | Roadmap for plans/actions; Evidence for *submitted claims*, Growth for derived progress | Mock scores have goal-specific scales; do not merge with career readiness score | Roadmap/Evidence/Growth |
| How to share study progress? | A source-owned meaningful activity, projected by Feed *after consent* | The existing \`career.activity.v1\` semantics may exclude exam-specific events | Contract version owner + Privacy |
| How to match NEET 2027 aspirants? | Career goal/stage as permission-safe matching input; connections/blocks remain Social Graph truth | Never infer minors' sensitive details or scrape phone contacts | Social Graph + Privacy |
| Who verifies MBBS seniors? | Experts with Admin reviewer workflow, Identity role/eligibility | Self-claimed institutions need clear unverified label; no open minor/adult messaging | Experts/Tanvi/Security |
| Where is feed relevance personalized? | Feed owns projection and ranking consuming allowed context | AI can suggest, cannot bypass consent and blocks | Feed + Security |
| What should happen when NEET learner becomes MBBS student? | Preserve same Identity + history, change active goal/context, keep previous archived | No mandatory conversion or graduation inference from dates | Career/Growth |
| Who owns public opportunity matching? | Existing Opportunities domain with age/consent restrictions | No duplicate school/college recommendation data in Feed | Opportunities/Security |

## C. Candidate conceptual data (NOT schema)

\`\`\`mermaid
flowchart LR
  ACCOUNT["Account + Consent (Identity)"] --> GOALS["Goals / Goal Stages (Career candidate)"]
  GOALS --> PLAN["Roadmap Plan / Missions"]
  PLAN --> EVIDENCE["Submitted Evidence + provenance"]
  EVIDENCE --> GROWTH["Longitudinal Growth"]
  GOALS -. "only consent-safe attributes" .-> MATCH["Peer discovery Social Graph"]
  GROWTH -. "approved shared activity" .-> POSTS["Feed / Stories projection"]
\`\`\`

**Candidate terms:** \`GoalContext\`, \`EducationalStage\`, \`GoalType\`, \`AttemptYear\`, \`JourneyState\`, \`PreparationTemplate\`, \`StudyTopicProgress\`, \`MockTestClaim\`, \`ActivityEvidence\`, \`MentorQualification\`. These are planning vocabulary **only**. Their field definitions, identifiers, persistence, versioning and authorization are left to approved owning-ticket contracts.

## D. Must-not-break existing invariants

1. **One source of truth per domain.** Do not create per-platform student account or goal databases. Android and web call approved service APIs.
2. **No cross-service DB reads.** Gateway can compose reads but never own Career truth. AI cannot mutate canonical learning records without authorized domain operations.
3. \`career.activity.v1\` is still canonical for eligible existing activity. **Do not silently broaden it** to exam/mock semantics until new contract and consumer tests are reviewed.
4. Consent, deletion, block and report must reach Feed, Notifications, Communities, Messaging and Admin projections.
5. Account deletion, goal deletion and progress visibility must be modeled with event consistency and auditability, not just hidden UI controls.
6. Do not expose or aggregate minors' study scores, exact schedules, private school information or messaging contacts via recommendation endpoints.
7. Mixed timelines must show **goal-specific progress**; no universal success score that ranks JEE mock marks against B.Tech placement readiness.
8. Existing CI, engineering-memory/ADR process, ticket handoff and web-vs-Android PR path gate remain mandatory.

## E. Versioned contract changes to propose later

These are **required RFC topics**, not endpoint promises:

- **Goal and education context read model:** how a client asks the Career owner for available journeys and active goal; authorization and alternatives.
- **Journey transition command:** switch primary context, archive or restart goal without deleting unrelated history; concurrency/idempotency.
- **Goal template catalog:** versioned exam topic lists with provenance and effective dates; unapproved/missing catalog state.
- **Preparation progress:** what constitutes a completed topic, self-reported mock score, revision and evidence strength; per-goal scope.
- **Activity projection:** which study actions may create a public progress card, opt-in audience, revoke/delete semantics.
- **Peer matching inputs:** minimize disclosed goal/stage/year; safety restrictions; no forced connection.
- **Mentor validation and interaction eligibility:** adult/minor boundary, verified vs self-claimed status, moderation workflow.
- **Analytics and safety:** minimal, privacy-safe action events, retention without profiling minors invasively.

**Change acceptance:** owning Jira ticket, ADR as needed, schema under \`packages/contracts/\`, producer/consumer compatibility tests, privacy negative tests and CI, staged rollout/rollback, and updated \`docs/engineering-memory\`. Breaking change requires new version. Keep existing contract untouched until approved.

## F. Risk register and mitigations

| Risk | Impact | Proposed control |
| --- | --- | --- |
| Unclear owner of student journey | Two incompatible schemas/API clients | Resolve Career-vs-Journey ADR before schema or code |
| Unsafe minor–mentor messaging | Real student harm, compliance and trust risk | Restrict adult–minor DMs until reviewed authorization policy and tests |
| Unlicensed/outdated exam syllabi | Misleading plans and legal risk | Curated sources, provenance/version, disclaimer and review cadence |
| Pressure/FOMO gamification | Student anxiety, unhealthy engagement | Opt-in sharing, self-relative goals, quiet hours and no shame-based nudges |
| AI hallucinated exam guidance | Misinformation | Curated catalog, source links, editable plans and uncertainty handling |
| Forced peer network / cold start | Spam and safety risks | 5–10 relevant opt-in suggestions, community-led onboarding |
| Universal score across different exams | False comparisons and inequity | Per-goal progress measures, user-controlled visibility |
| Unrealistic all-India scope | MVP delays | Two user-persona pilot; grow exam catalog from validated demand |
| Web/Android drift | Duplicate features/contracts | Same API owners, separate tickets/Figma variants, CGN-286 scope gate |
| Social feed leakage | Private progress exposed after deletion | Source owner authorization and asynchronous projection revocation tests |

## G. Concrete approval checklist before any implementation

- [ ] Sandeep approves canonical owner of Journey/Goal/Stage and changes to bounded-context map.
- [ ] Tanvi and Sandeep approve age/guardian-consent and mentor-contact policy, with legal advice where required.
- [ ] Career owner signs off NEET goal template source and exam syllabus provenance.
- [ ] Roadmap + Growth owner signs off mock/revision semantics and how progress is computed.
- [ ] Feed + Social Graph owners sign off safety-filtered, opt-in peer/activity integration.
- [ ] Prachi confirms realistic web/Android UI parity and Figma screen states.
- [ ] All new integration contracts are versioned, tests and migration paths documented before coding.
- [ ] Private beta safety and evidence gates are agreed; no paid cloud or Play Store release authorized.

**Decision labels:** \`PROPOSED\`, \`ACCEPTED\` (with Jira/ADR references), \`REJECTED\`, \`DEFERRED\`. Unresolved items must not appear as “implemented truth” in \`05-current-state.md\`.

## H. Delivery sequence

1. PRD + gap audit accepted.
2. Architecture RFC and explicit privacy/security decisions.
3. User interviews / pilot scope confirmation.
4. User flow, design system, Stitch concept layouts → approved Figma frames.
5. Ticket-level contract designs, web/mobile scope, design references and tests.
6. Only then source code implementation via the existing three-agent/PR CI process.
