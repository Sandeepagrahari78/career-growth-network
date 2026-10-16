# CGN Student Ecosystem V2 — Product Requirements Document

> **Decision status:** The **direction** toward a continuous student ecosystem was team-approved as reported by the product owner on 2026-10-16. **The detailed MVP, individual screens, API contracts, resource estimates and content commitments are proposals pending their owning tickets and reviews.**
>
> **Jira:** [CGN-288](https://sandeepagrahari1.atlassian.net/browse/CGN-288) | **Baseline \`main\`:** \`1352de4f598041ca2865c36e838c8c06306e631e\` (2026-10-16) | **Reviewers:** Sandeep (technical), Prachi (web/Android design), Tanvi (community/QA/safety).
>
> This document does **not** mean the V2 product is coded, approved for minors, published or live.

## 1. Product north star and positioning

**CGN — Your Journey. Your People. Your Growth.**

A personalized student **education + preparation + career growth + social network** that continues with a learner as their stage and goals evolve after Class 10, through exam preparation, college, projects, skills, opportunities and professional life.

- **One identity, multiple journeys:** Student data and opted-in connections need not be rebuilt whenever goals change.
- **Social-first Home:** Relevant peer progress, community activity, stories, discussions and personal relationships. Keep the existing GitHub [product north star](../engineering-memory/00-product-north-star.md): SEE → GET INSPIRED → DO → PROVE → GROW → SHARE → CONNECT → OPPORTUNITIES → COME BACK.
- **Execution-first My Journey:** Plan, act, evidence, progress and next steps, tailored to one selected active journey.
- **Trusted network:** Meaningful peers, verified seniors, domain experts and opt-in support; not compulsory follows.
- **Invisible assistive AI:** Helps create/edit plans and make relevant recommendations. Humans retain agency; no promises of exam rank, admission or job.
- **One monorepo / two frontends:** Next.js web \`apps/web/\` and Expo/React Native Android \`apps/mobile/\` share versioned owning-service contracts and privacy rules. No iOS launch initially.

**Not:** a generic full-syllabus coaching business, universal AI expert, mandatory competitive leaderboard, substitute for certified teachers/medical advice, or a guarantee of retention/exam success.

## 2. Student lifecycle and goals

A student can have **multiple concurrent goals**, one active *context* for a given Journey view, and history/achievements from completed or abandoned goals. Changing a goal **must not reset identity, permissions or unrelated achievements**. Journeys are not necessarily sequential.

| Persona | Current situation | Desired value | First experience |
| --- | --- | --- | --- |
| Class 10 graduate | Choosing stream/exam/college direction | Explore options and trusted communities | Education stage, interests, broad goal exploration |
| NEET aspirant | Class 11/12, repeat or revision | Biology/Physics/Chemistry milestones, personal timetable, real peer accountability and trustworthy senior guidance | NEET context; target year; syllabus goals; optional similar-stage peers |
| JEE aspirant | Class 11/12 | Subject work, mocks, revision and relevant aspirant network | JEE-specific template after content validation |
| UPSC/CAT/GATE/other aspirant | Graduate, working or preparing | Custom-duration plan, tests and peer circles | Extensible journey template; **not** a promise of day-one verified content for every exam |
| B.Tech student | First-year through placement | Skills, projects, evidence, communities and opportunities | College/career journey, relevant peers and experts |
| MBBS/other college student | Joined course after preparation | Transition from preparation to college skills/community | Preserve prior journey; show course-specific areas when defined |
| Verified senior/mentor | Opt-in specialist | Safe Q&A, knowledge sharing and appropriate guidance | Verification, permissions and availability controls |

### Suggested journey transitions

\`\`\`mermaid
flowchart LR
    A["One Identity + Consent"] --> B["Select Current Stage & Goals"]
    B --> C["Exam Preparation Journey"]
    B --> D["College / Skills Journey"]
    B --> E["Career / Opportunity Journey"]
    C --> F["Milestones + Activity + Evidence"]
    D --> F
    E --> F
    F --> G["Longitudinal Growth Identity"]
    G --> H["Social-first feed + peers + communities"]
    G --> I["Update goals / start another journey"]
    I --> B
    H --> J["Opt-in verified mentor pathways"]
\`\`\`

## 3. Product loops and differentiated value

**Action loop:** user chooses a goal → receives an editable plan → completes meaningful activity → optionally uploads evidence → private progress updates → consented sharing to chosen audience → relevant peers interact → useful next action.

**Social loop:** opted-in peer discovery → follows/connections → feed, communities, messaging under safety policy → accountability through **real, consented** accomplishments → optional support → contribution back to growth loop.

**Mentor loop:** qualified, verified senior → public guidance, moderated Q&A, age-appropriate group interaction → useful feedback → reputation based on verification and quality, **not** unverified authority.

**Continuity loop:** exam preparation → college/alternative pathway → graduation/skills/work → become senior or mentor; students retain their account and approved history.

Do **not** rely solely on anxiety, guilt or compulsory “30 peers” to manufacture FOMO. A peer may inspire another student, but CGN optimizes for **completed meaningful work, healthy return visits and wellbeing**, not addictive screen time. Offer comparison opt-outs, rest days, private-by-default marks and pressure-free notification schedules.

## 4. Feature requirements by domain

**KEEP** indicates largely compatible pre-existing Jira proposal; **EXTEND** needs expanded acceptance criteria; **ADD** is a net-new planned V2 capability; **DEFER** is out of the first pilot. See the [epic-by-epic gap audit](CGN_V2_FEATURE_GAP_MATRIX.md). All product features below are **requirements proposals**, not current implementation claims.

| Domain | Core requirements | Proposed release | Existing anchors |
| --- | --- | --- | --- |
| Identity + consent | Account, profile, privacy, age-aware onboarding, same identity across stage transitions, deletion | P0 | CGN-11, CGN-10 |
| Journey/context model | Stage, many goals, active context, progress history, no account reset, transitions, approved goal taxonomy | P0 | Extend CGN-13/14/15/16; contract RFC needed |
| Personalized onboarding | Goal → exam/degree/skill → target stage/date/available time → privacy → first useful action | P0 | CGN-13/14, CGN-28/29 |
| Social Home | Feed, real growth-story cards, safe posts, following, contextual discovery, privacy-aware projections | P0 | CGN-28, CGN-262 |
| Peer matching | Relevant, optional 5–10 initial suggestions by goal/stage/interests; request/accept/block/report | P0 | CGN-21 |
| Communities | Exam/stage/college/skills interest spaces; membership, Q&A, moderation | P0 | CGN-22, CGN-263 |
| Safe messaging | Permission-aware requests, conversations and report/block across surfaces; minor protections | P0 with restricted scope | CGN-264, CGN-10 |
| My Journey | Current active goal, timeline, daily actions, progress and personal evidence | P0 | CGN-15/16/17/18 |
| Exam-prep template | NEET **pilot**: subjects/topics by validated source, editable plan, 30/60/100-day custom duration, mock scores and revisions | P0 narrow pilot | **New**, integrate career/roadmap |
| College growth template | B.Tech **pilot**: skills, project proof, portfolio and next career action | P0 | CGN-13/16/18 |
| AI assistance | User-editable proposed plan and relevant suggestions; uncertainty, fallbacks and privacy | P0 basic / P1 deeper | CGN-20 |
| Growth identity | Proof-based milestones and separate goal-specific metrics, not single cross-exam ranking | P0 | CGN-15 |
| Mentor discovery | Verified mentor profile and moderated public Q&A; private minor/adult interactions restricted | P0 curated, P1 broader | CGN-23 |
| Opportunities | Relevant scholarships, internships and industry opportunities with eligibility/consent | P1 | CGN-24/25 |
| Notifications | Messages, activities, user-controlled schedule and quiet hours | P0 essential | CGN-26 |
| Analytics | First useful action, weekly action, D7/D30 retention, safety signals, opt-in student-reported benefit | P0 measurement | CGN-30 |
| Admin/support | Catalog curation, moderation, verification, policy logs, deletion response | P0 | CGN-27/278 |
| Android/web | Consistent goals/contracts; native layouts, offline/error/empty/loading/permission variants | P0 pilot parity | CGN-28/29, CGN-286 |
| Full national exam library | All exam banks, high-stakes rankings, test-series integrations, paid mentor marketplace | P2 / evidence-gated | NEW/DEFER |

### Acceptance standards shared across journeys

1. A student's selected journey determines **relevant content and actions**, not their fundamental rights, identity or privacy policy.
2. Users may switch between active goals and revisit historic achievements without wiping account data.
3. An account may follow a verified senior, but verification alone never grants unrestricted DM eligibility—especially to minors.
4. Consent and block status from owning services must filter feed, recommendations, notifications and messaging.
5. Activity is not equivalent to ability: mock-test self-reports and evidence must be labeled unverified unless validated.
6. At least one **meaningful action** and one **optional helpful peer/community discovery** are possible without compulsory follows or public posting.
7. User-facing flows cover permissions, recovery, network errors, empty states, accessibility and reduced connectivity.
8. Cross-domain events and APIs need owning-ticket schema proposals and tests, not assumptions from this PRD.

## 5. Recommended P0 pilot (hypothesis)

**Two personas:** (1) NEET exam aspirants in one well-defined target-year cohort; (2) B.Tech college students starting/continuing career growth. Allow other users to request future templates **without promising fully supported exam-specific content**.

**End-to-end pilot scenario** on web and Android:

1. Sign up with appropriate age/consent guardrails and choose NEET or B.Tech goal.
2. See social-first Home + relevant community + optional peer suggestions.
3. Open My Journey and receive an **editable** initial goal plan; complete a daily action.
4. View personal progress and optionally share a limited-audience progress card.
5. Interact safely with peers or a moderated, verified senior Q&A.
6. Return next week to see updated history and next step; optionally update goal.
7. Admin can moderate, manage basic goal catalog, resolve reports and fulfill deletion requests.

**Deliberately not P0:** national syllabus coverage, guaranteed mentor appointments, fully automated professional advice, cross-exam competition ranking, paid course/video marketplace, Instagram-scale reels, uncontrolled minor DMs, AI predictive admission/rank scores, mass scraped student data.

### Validation plan and metrics

First, 10–15 exam aspirant + 10–15 college-student interviews (with appropriate consent and a safeguarding protocol for minors); then an explicitly scoped private beta with real moderation. No fabricated findings.

- **Activation:** percentage who select goal **and complete first useful task** in the first seven days.
- **Healthy retention:** D7/D30 return **with a meaningful action**, not only scrolling time.
- **Peer utility:** opt-in suggestions accepted, conversations/replies producing reported help, no forced connections.
- **Action completion:** weekly meaningful activities with honest evidence label.
- **Continuity:** whether a user can switch a journey while preserving settings/progress.
- **Safety:** reports per active user, handling time, abuse recurrence, minor-message policy violations, negative wellbeing feedback.
- **Qualitative outcome:** self-reported usefulness, perceived peer pressure and intent to continue after novelty fades.

Set targets only after baseline; no claim of guaranteed retention, market share or 5,000 **concurrent** users. The existing 5,000 target refers to beta accounts and is not yet proven by current demos.

## 6. Privacy, safety and responsible engagement

A sizeable Class 11/12 audience is under 18. Before public beta, review applicable Indian child privacy/consent law and platform policy with qualified counsel. Product rules to evaluate:

- Age-aware onboarding and verified consent where legally necessary; data minimization; private-by-default marks, schedules and sensitive activity.
- No precise location, school/campus attendance tracking or contacts scraping by default.
- Never force 30 friend connections; suggestions are optional and cannot expose private profiles.
- Explicit boundary for minor/adult direct messaging. Use moderated/public group guidance until safe, approved permissions are established.
- Mentor credential verification, impersonation/report workflow and no admission/job guarantees.
- Progress visibility selector (only me / selected people / approved community if safe); block, report, delete and export.
- No streak-shaming, deceptive scarcity, public low-rank humiliation or guilt notifications. Add quiet hours, recovery days and comparison off-switch.
- Audit major profile, consent, moderation and access decisions without exposing private messages through Admin.

## 7. Architecture integration and constraints

**Current authoritative source** is [\`cgn.bounded-contexts.v1\`](../../packages/contracts/architecture/bounded-contexts.v1.json), NOT this PRD. Proposed entity/owner decisions are laid out in [V2 Architecture Decision Brief](CGN_V2_ARCHITECTURE_DECISION_BRIEF.md).

- Prefer extending **Career Intelligence** for goal/stage/track truth, **Roadmap** for executable plans/missions, **Growth** for longitudinal progress, **Social Graph** for follow/block, **Feed** for projections, **Communities** for membership, **Experts** for verification and **Identity** for consent. Whether a dedicated Journey domain is warranted is **open** until architecture review.
- Keep versioned APIs/events and \`career.activity.v1\` until its owning schema is approved for change. Do not silently repurpose existing "career" events to unverified exam scores.
- No direct cross-service DB reads; no second login database for Android; no paid cloud, Play Store release or unreviewed Android SDK changes.
- Draft UI in Stitch or Figma as concepts; **only approved Figma frames** plus Jira acceptance criteria and merged contract references become coding-agent specifications.
- Existing \`AGENTS.md\` and Jira requirements remain operational until explicit migration; new direction approval alone does not rewrite every ticket.

## 8. Product acceptance checkpoints

| Gate | Evidence | Human approval |
| --- | --- | --- |
| Vision | This PRD + gap matrix reviewed | Sandeep, Prachi, Tanvi |
| Pilot scope | User interviews + measurable use cases, named NEET/B.Tech scope | Product owner / team |
| Architecture RFC | Owner matrix, data privacy/consent model, backward-compatible event/API proposal | Sandeep and owning implementers |
| UX foundation | Journey flows, component tokens, 5 core area designs, states, review feedback | Prachi + product owner |
| Jira synchronization | Child tickets with exact acceptance, platform scope and approved Figma version | Owners and Sandeep |
| Build/release | Existing GitHub PR CI, main/staging, performance and safety evidence | Tech owner / QA / release owner |

**Explicit pending questions:** target pilot age bracket, source and licensing of NEET syllabus/topic content, exact active-goal rules, minors' messaging and consent policies, mentor verification criteria, free-vs-paid service assumptions, first platform parity boundary and beta success thresholds. Decisions must be documented—not guessed by agents.

## 9. References and status

- [Existing product north star](../engineering-memory/00-product-north-star.md)
- [Bounded contexts](../../packages/contracts/architecture/bounded-contexts.v1.json)
- [Jira Epics](CGN_V2_FEATURE_GAP_MATRIX.md)
- [Web/Android ownership](../architecture/WEB_ANDROID_AGENT_OWNERSHIP.md)
- [V2 architecture decision brief](CGN_V2_ARCHITECTURE_DECISION_BRIEF.md)
- [V2 design handoff](CGN_V2_DESIGN_HANDOFF.md)

This is a **versioned proposed product document**. Merge of planning docs records shared direction; it does not constitute product-code implementation, feature acceptance or authorization to expose underage accounts publicly.
