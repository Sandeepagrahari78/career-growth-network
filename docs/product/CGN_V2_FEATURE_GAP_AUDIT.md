# CGN V2 — Existing Jira Feature Audit & Gap Matrix

**Status:** reviewed-source audit, 2026-10-16. **Direction:** team-approved; delivery tiers and model decisions proposed. **Tracking:** CGN-288; V2 umbrella CGN-289. **Baseline:** main SHA `1352de4f598041ca2865c36e838c8c06306e631e`.

This is an audit of **Jira planning** and **merged GitHub architecture**, *not* a claim that every Epic's product APIs work. Existing verified runtime is primarily CI/infrastructure/health-demo; web/mobile are workspace skeletons. Individual Jira tickets may be further ahead/behind their Epics. All existing Epic descriptions and child tickets remain unchanged in this planning phase.

## 1. Keep, extend, add or defer — product capabilities

| Domain/capability | Decision | Jira owner Epic(s) | Proposed V2 delta | Implementation/source impact |
| --- | --- | --- | --- | --- |
| Identity, account, consent | EXTEND | [CGN-11](https://sandeepagrahari1.atlassian.net/browse/CGN-11) | stage/age-aware privacy and goal contexts | No new canonical identity owner; consent policy review |
| Career tracks and education ontology | EXTEND | [CGN-13](https://sandeepagrahari1.atlassian.net/browse/CGN-13) | school, exam, education program, attempt-year, career paths | Need versioned catalog/ontologies |
| Diagnostic/current state | EXTEND | [CGN-14](https://sandeepagrahari1.atlassian.net/browse/CGN-14) | preparation readiness alongside skills | Context-specific diagnostics; never assume one score |
| Growth Identity and graph | EXTEND | [CGN-15](https://sandeepagrahari1.atlassian.net/browse/CGN-15) | stage-specific longitudinal evidence; journey continuity | Keep single growth domain; no universal rank |
| Roadmap and next best action | EXTEND | [CGN-16](https://sandeepagrahari1.atlassian.net/browse/CGN-16) | custom duration study/career plans, topic/revision paths | P0 planning semantics subject to contract review |
| Tasks, streaks and execution | EXTEND | [CGN-17](https://sandeepagrahari1.atlassian.net/browse/CGN-17) | topic progress, study missions, flexible rest | No guilt-based streak penalties |
| Proof/evidence | EXTEND | [CGN-18](https://sandeepagrahari1.atlassian.net/browse/CGN-18) | self-reported tests/notes distinct from verified evidence | Capture provenance and self-report indicator |
| GitHub project integration | KEEP | [CGN-19](https://sandeepagrahari1.atlassian.net/browse/CGN-19) | for coding/project paths, not all students | Do not force on NEET learners |
| AI intelligence/evals | EXTEND | [CGN-20](https://sandeepagrahari1.atlassian.net/browse/CGN-20) | optional study timetable suggestions, goal switching | Assistive, editable, versioned, source-aware |
| Social connections and matching | EXTEND | [CGN-21](https://sandeepagrahari1.atlassian.net/browse/CGN-21) | study stage, target year and goal peers; opt-in | Eligibility, privacy and anti-spam controls |
| Cohorts and squads | EXTEND | [CGN-22](https://sandeepagrahari1.atlassian.net/browse/CGN-22) | exam/year groups; safe study circles | No forced auto-add; moderated participation |
| Expert validation | EXTEND | [CGN-23](https://sandeepagrahari1.atlassian.net/browse/CGN-23) | verified seniors, mentor role, approved Q&A | Separate identity/qualification evidence; minor protections |
| Opportunities matching | EXTEND | [CGN-24](https://sandeepagrahari1.atlassian.net/browse/CGN-24) | scholarships/exams/colleges, later alongside internships | Verify listings, timing and age eligibility |
| Recruiter platform | KEEP / DEFER broad V2 | [CGN-25](https://sandeepagrahari1.atlassian.net/browse/CGN-25) | still for eligible college/graduate users | Consent-gated; P2 monetization separate |
| Notifications | EXTEND | [CGN-26](https://sandeepagrahari1.atlassian.net/browse/CGN-26) | goal deadlines, calendar, safe digests and quiet hours | No manipulative social-pressure alerts |
| Admin/moderation/support | EXTEND | [CGN-27](https://sandeepagrahari1.atlassian.net/browse/CGN-27) | minor-safety incident handling, goal catalog governance | Privacy-safe admin projections |
| Social Home/web | EXTEND | [CGN-28](https://sandeepagrahari1.atlassian.net/browse/CGN-28) | personalized by current journey; social-first remains | Figma/Next.js UX review |
| Android/PWA core | EXTEND | [CGN-29](https://sandeepagrahari1.atlassian.net/browse/CGN-29) | goal-specific UI parity; Android only store target | Expo React Native, same service APIs |
| Engagement analytics | EXTEND | [CGN-30](https://sandeepagrahari1.atlassian.net/browse/CGN-30) | meaningful actions, retention, pressure/wellbeing | Age-safe privacy preserving measures |
| QA/beta launch | EXTEND | [CGN-31](https://sandeepagrahari1.atlassian.net/browse/CGN-31) | two-path V2 usability/safety beta | No assumption capacity verified |
| Feed & Stories | KEEP + EXTEND | [CGN-262](https://sandeepagrahari1.atlassian.net/browse/CGN-262) | consented preparation progress cards | Source-owned projection and deletes |
| Communities & discussion | EXTEND | [CGN-263](https://sandeepagrahari1.atlassian.net/browse/CGN-263) | exam and college communities; moderation | Membership policy unchanged |
| Messaging | EXTEND | [CGN-264](https://sandeepagrahari1.atlassian.net/browse/CGN-264) | safe approved peer/mentor conversation controls | Social Graph blocked relationships authoritative |
| Exam/study catalog | ADD (requires own approved implementation ticket) | [CGN-289](https://sandeepagrahari1.atlassian.net/browse/CGN-289) | exam templates, stage/attempt/year/syllabus versions | Career domain ownership decision CGN-290 |
| Multiple journeys and transitions | ADD (requires own approved implementation ticket) | CGN-289 | switch/active/archive journeys, preserve history | Core Career/Growth/Identity review CGN-290 |
| Study completion and mock test records | ADD via extending existing owner | CGN-289, CGN-16/18 | topic/task/score evidence with provenance | Roadmap + Evidence semantic review |
| Education-stage adaptive UX | ADD on existing web/mobile shells | CGN-291 and CGN-28/29 | contextual dashboard, dynamic quick actions | Figma screens and token parity required |
| Minor-safe peer/mentor interaction | ADD controls to existing policies | CGN-289 and CGN-10/21/23/27 | restricted defaults and verification | No implementation until privacy approval |
| Wide all-exam licensed content | DEFER | none verified | large exam library/question bank | Content rights, experts and operations needed |
| Paid coaching/mentor marketplace | DEFER | none approved | fees, cancellations, disputes, guardianship | Commercial/legal review needed |
| Mandatory 30 peers/global leaderboard | EXCLUDE | no owning ticket | conflicts with consent/wellbeing | Replace with optional suggestions |
| iOS Apple App Store | EXCLUDE CURRENT PHASE | CGN-287 Android-only | no iOS build | Keep Expo cross-platform potential only |

## 2. Complete pre-existing Epic disposition (31 / 31)

**Architecture/infrastructure/security Epics remain KEEP, not duplicated:** [CGN-5](https://sandeepagrahari1.atlassian.net/browse/CGN-5) Platform Architecture; [CGN-6](https://sandeepagrahari1.atlassian.net/browse/CGN-6) IaC; [CGN-7](https://sandeepagrahari1.atlassian.net/browse/CGN-7) Kubernetes; [CGN-8](https://sandeepagrahari1.atlassian.net/browse/CGN-8) CI/CD GitOps; [CGN-9](https://sandeepagrahari1.atlassian.net/browse/CGN-9) Observability; [CGN-10](https://sandeepagrahari1.atlassian.net/browse/CGN-10) Security/Privacy; [CGN-12](https://sandeepagrahari1.atlassian.net/browse/CGN-12) Gateway/BFF; [CGN-278](https://sandeepagrahari1.atlassian.net/browse/CGN-278) Admin Ops/5K capacity. Platform privacy/security **must be reviewed** for new minors and new usage, but do not create replacement platforms.

**Product Epics disposition is specified in the table:** CGN-11 through CGN-31, plus CGN-262, CGN-263 and CGN-264. Jira was checked on 2026-10-16; Epic `To Do` status does not mean all linked sub-tickets are unfinished. **Never substitute numbered-key order for explicit Jira dependency links.**

## 3. Grounded existing examples for agent continuity

| Existing Jira ticket | Existing requirement | V2 relation | Owner focus |
| --- | --- | --- | --- |
| [CGN-127](https://sandeepagrahari1.atlassian.net/browse/CGN-127) | Signed-in Social Home feed shell/Stories | Extend stage-specific content | Prachi UI |
| [CGN-172](https://sandeepagrahari1.atlassian.net/browse/CGN-172) | Peer journey comparison **without global ranking** | Preserve non-toxic motivation | Prachi |
| [CGN-175](https://sandeepagrahari1.atlassian.net/browse/CGN-175) | Mobile growth profile and peer discovery | Adapt to stage + goal | Prachi |
| [CGN-266](https://sandeepagrahari1.atlassian.net/browse/CGN-266) | Personalized Social Home API/ranking | Incorporate goals only after reviewed contract | Prachi / source owners |
| [CGN-267](https://sandeepagrahari1.atlassian.net/browse/CGN-267) | Growth Story privacy states | Apply opt-in education progress | Prachi |
| [CGN-268](https://sandeepagrahari1.atlassian.net/browse/CGN-268) | Structured progress post composer | Add approved study milestones | Prachi |
| [CGN-272](https://sandeepagrahari1.atlassian.net/browse/CGN-272) | Community moderation and safety | Age-appropriate V2 controls | Tanvi |
| [CGN-286](https://sandeepagrahari1.atlassian.net/browse/CGN-286) | PR web/Android ticket-file ownership | KEEP, map new UI tickets after review | Sandeep |
| [CGN-287](https://sandeepagrahari1.atlassian.net/browse/CGN-287) | Google Play readiness only | KEEP; no store registration/publish | Prachi |

## 4. Exact Jira / GitHub reconciliation rules

1. **KEEP:** do not edit current Jira scope only because the V2 umbrella Epic exists.
2. **EXTEND:** child ticket owner must review acceptance criteria, impacted schema/events, old consumers, tests, privacy and approved Figma. Use new linked, narrow V2 tickets rather than silently expanding unfinished product tickets.
3. **ADD:** create implementation ticket only **after CGN-290 architecture and CGN-291 UX decisions**, with owner, acceptance criteria, designs and API contract. Proposed capabilities in this document are not build authorization.
4. **DEFER/EXCLUDE:** do not put in first beta or let coding agents invent it.
5. **GitHub main is code truth.** `packages/contracts/architecture/bounded-contexts.v1.json` remains authoritative for domain boundaries. `career.activity.v1` and `domain.event.envelope.v1` are existing contracts, **not proof** study activity payloads are approved.
6. Preserve `apps/web` Next.js and `apps/mobile` Expo/React Native separation and reviewed offline ticket-platform map. A product design can cover both clients, but **implementation** must obey ticket/PR boundaries.

## 5. Main architecture decision questions awaiting CGN-290

- Are education stage and active journeys owned solely by **Career**, with Identity holding only account/age/consent, or are there other existing domain rules? An ADR and actual existing code/contracts decide.
- Should exam/syllabus templates live as versioned Career catalog objects with Roadmap references or require a new bounded context? **Do not add service now.**
- Who owns raw self-reported mock scores vs evidence confidence? Do not project score as verified exam outcome.
- What is the contract for switching journeys and ensuring growth timeline/history remain intact?
- Which peer-match features are permissible for minors? What changes to Social Graph block/consent read models are necessary?
- How will Privacy, Messaging, Feed, Notifications and Admin consistently enforce restricted/blocked or deleted state?
- How do personalization features degrade gracefully when AI or external exam content is unavailable?

## 6. Next deliverables

- [CGN V2 PRD](CGN_V2_PRODUCT_VISION.md)
- [Architecture and contract impact review](CGN_V2_ARCHITECTURE_REVIEW.md)
- [Design handoff and initial screen map](../design/CGN_V2_DESIGN_HANDOFF.md)
- Research interviews, user consent and MVP scoring tracked by [CGN-292](https://sandeepagrahari1.atlassian.net/browse/CGN-292).

**Decision gate:** after technical/privacy/design review, create small scoped implementation tickets. Do not merge hypothetical schema/API details or replace old epics during discovery.
