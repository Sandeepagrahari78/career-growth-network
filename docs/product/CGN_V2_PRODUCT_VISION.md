# CGN V2 — Student Ecosystem Product Requirements Document

**Decision:** Product direction approved by the CGN team (reported by the founder on 2026-10-16). **Implementation:** not yet approved. **Version:** 2.0.0 product direction; proposed solution and MVP scopes are subject to discovery/architecture review. **Jira:** [CGN-288](https://sandeepagrahari1.atlassian.net/browse/CGN-288), umbrella [CGN-289](https://sandeepagrahari1.atlassian.net/browse/CGN-289).

## 1. Executive vision

CGN evolves from a college-career focused Career Growth Social Network into a continuous **Student Journey, Social Life and Growth Ecosystem** for learners after Class 10, through exam preparation, college, skills, placements, further education and early professional growth. Preserve the existing connected social-growth loop instead of building separate, disconnected apps for each exam:

**See authentic, consented peer progress → get inspired → take a meaningful action → record/validate evidence → grow → optionally share → connect with appropriate peers/mentors → discover relevant opportunities → repeat.**

**Positioning:** Your Journey. Your People. Your Growth.

**North-star principles:** signed-in **Home is social-first**, **My Journey (formerly My Career)** is execution-first; AI is an internal assistant, never the canonical source of exam, mentor, skill, identity or social truth. Students can switch or add goals and stages without replacing accounts. Website and Android share owning backend APIs and contracts; presentation differs by platform.

## 2. Problems to validate (hypotheses, not proven facts)

- Preparation planning, test progress, study peer groups, senior advice and education transitions are fragmented across tools.
- College users likewise lack a durable, transferable profile connecting meaningful study/work evidence, community and opportunity readiness.
- Seeing **real, voluntarily shared** peer progress may motivate some users; excessive comparisons, forced leaderboards or streak shame could reduce wellbeing, particularly for minors. No commitment to deliberately exploit FOMO.
- Relevant mentors and friends improve perceived value **only if** safety, identity verification, actual supply and matching quality are adequate.
- A broader total addressable audience does not prove demand or a 1% market share; retention is an experiment, not a guarantee.

## 3. Personas and representative journeys

| Persona | Initial intent | Personalized experience | Transition |
| --- | --- | --- | --- |
| After-Class-10 student | Choose education direction | Guided pathway exploration, age-safe communities, limited peer discovery | Add new study/preparation goal |
| NEET learner, Class 11 | Prepare for target year | Biology/Chemistry/Physics template, timetable, revision and optional mock logs; same-stage peers, verified MBBS seniors | Class 12, exam attempt, college, alternate goal |
| JEE learner | Prepare with own stage/date | Physics/Chemistry/Math template, problem-solving milestones, study peers | Undergraduate degree or other chosen path |
| B.Tech first-year student | Explore skills and college life | Projects, coding track, first-year peers, seniors, communities | Internships, placements, postgrad |
| College graduate / CAT/UPSC/GATE learner | Balance goals and study | Multi-goal schedule, eligibility/deadline tracking, peer network | Higher education, professional role |
| MBBS senior / industry expert | Contribute expertise | Identity verification, public guidance, opt-in and age-safe mentorship | Remain learner and mentor simultaneously |
| Community moderator | Protect participant safety | Reports, queues, permissions, audit trail | Escalation and resolution |
| Admin/product operator | Maintain catalog and policy | Exam templates, resources provenance, feature rollout and aggregates | Update content without altering canonical domain ownership |

Students may move sideways, pause or abandon a path; life journeys are **not** a mandated linear school-to-job funnel.

## 4. Core experience — reusable, life-stage adaptive

1. **Onboarding:** age-appropriate consent → current stage (e.g., after Class 10, Class 11/12, college, graduate) → one or more primary goals → target and readiness inputs → privacy defaults → choose suggested communities/peers rather than auto-connecting.
2. **Social Home:** relevant posts, opted-in peer achievements, Growth Stories, trusted groups and guidance; genuine actions, not engagement bait.
3. **My Journey:** a set of goal cards and active-journey switcher; each contains a personal progress view, milestone timeline, today's meaningful next action, approved study/career plan and private reflections.
4. **Preparation:** exam and attempt-year selection, syllabus/topic completion, task schedule, revision and **user-entered** mock scores. Educational content requires validated licensing/provenance; AI cannot invent official exam notices.
5. **College/Career:** existing skills, projects, evidence, diagnostics, milestones, internships and opportunity discovery are retained.
6. **Community:** exam/year/stage-based peers, optional group study and supervised mentoring where allowed; respect block, consent and visibility across all clients.
7. **Transition:** create the new goal/journey, retain prior authorized achievements/connections, archive or pause old goals and recompute recommendations without falsely asserting completion or exam success.
8. **Expert path:** learner can request verification for senior/mentor status. No self-claimed medical/professional verification, unmoderated mentor-to-minor DMs or promised outcome.

## 5. Proposed product features / delivery tiers

| Capability | Decision | Initial intended tier | Existing source |
| --- | --- | --- | --- |
| One account, auth, consent and privacy | KEEP + EXTEND for age/stage | P0 | CGN-11 |
| Existing Career/Diagnostic goals | EXTEND to multiple stage-aware goals | P0 | CGN-13/14 |
| New Journey selector/switch and historical journey | ADD with Career/Growth ownership review | P0 | CGN-289/290 |
| Exam goal templates (pilot NEET only initially) | ADD through catalog/versioning | P0 limited | CGN-289/292 |
| Preparation topics, timetable and self-reported mock tracking | ADD using Roadmap/Evidence after contract review | P0 limited | CGN-16/17/18 + CGN-290 |
| College/B.Tech skill and project path | KEEP + EXTEND | P0 | CGN-15/16/18 |
| Social Home, stories, structured growth posts | KEEP + EXTEND recommendations | P0 | CGN-28/262 |
| Consent-based relevant peers, connections and block | KEEP + EXTEND stage/goal matching | P0 | CGN-21 |
| Safe communities and discussions | KEEP + EXTEND exam cohorts | P0 | CGN-22/263 |
| Messaging with age and interaction safeguards | KEEP + SAFETY EXTEND | P0 appropriately limited | CGN-264 |
| Verified seniors/mentor discovery and public Q&A | KEEP + EXTEND | P1; limited public guidance pilot | CGN-23 |
| AI initial suggested plans with human correction | KEEP + EXTEND; fallback when unavailable | P0 pilot | CGN-20 |
| Evidence/longitudinal Growth Identity | KEEP + EXTEND stage-specific, no global rank | P0 | CGN-15/18 |
| Opportunities, scholarships, recruiters | KEEP + EXTEND education choices | P1–P2 | CGN-24/25 |
| Wide all-India exam syllabus/content coverage | DEFER / validate licensing and supply | P2 | No verified approved implementation ticket |
| Paid mentoring, course marketplace, voice/video calls | DEFER pending legal/supply/business validation | P2 | No approved implementation scope |
| Web and Android clients, one API contract | KEEP | P0 foundation | CGN-28/29/286 |
| iOS / Apple App Store | OUT OF SCOPE | — | CGN-287 Android-only plan |

Tier assignments are **proposals** until tested against team capacity and student research.

## 6. MVP recommendation, not a claim of feature readiness

**Two representative paths:** NEET 2027 preparation and B.Tech first-year skill/project growth, using a single social-first Home and one shared student identity. Keep architecture extensible but do **not** attempt all Indian exams at launch. Year, exam date and content must be verified against official sources when an actual catalog ticket is implemented.

**P0 usable vertical slice:** signup/permissions → journey choice → first plan/today action → task completion/progress evidence → *optional* share to trusted peers → accepted peer/community interaction → revisit next action. Include report/block, private-progress defaults, accessible/empty/offline/error states, verified-content disclaimers and instrumentation. Minor accounts receive restrictive defaults and age-appropriate contact controls.

**P1:** adaptive timetable/revision analytics, validated senior mentoring, richer cohorts, scholarship opportunities, AI-assisted recommendations with human control, Android notifications. **P2:** full cross-exam library, institutional partnerships, recruiter/mentor monetization, deep content/licensed assessments.

## 7. Retention, success and falsifiable hypotheses

Primary meaningful product signal: proportion of eligible weekly active students completing **at least one self-chosen growth action** and reporting usefulness. Observe *7-/30-day opt-in retention* and **completed goals vs app opens**, not minutes scrolled.

Measure: onboarding completion; time-to-first-meaningful-action; consented peer invitation/acceptance rates; percentage using private vs shared posts; relevant group participation; recurrence of purposeful goal updates; verified mentor response; report/block volume, response time and safety incidents; perceived pressure/wellbeing; data deletion turnaround. Break down by opted-in stage/cohort with privacy-safe aggregation.

**Pilot research gate:** interview 10–15 exam-prep and 10–15 college students (with required age-appropriate consent); prototype-test at least two transitions and restricted contact flows. Record **unknowns** rather than inventing success metrics/market sizing. Evaluate a controlled social/peer-motivation intervention against a private-mode control where ethically appropriate.

## 8. Hard product and policy requirements

- Under-18 participants: age-aware access/consent, data minimization, private defaults, safe matching, reporting, moderator response, verified mentor eligibility, and professional legal/privacy review for applicable Indian child/data rules.
- No forced 30-peer connections, manipulative FOMO push alerts, public marks/rank by default, universally comparable career scores, guaranteed outcomes or hidden addictive reward loops.
- Peer activity and progress visibility must be explicitly user-controlled; blocked and deleted data must not leak through feed, notifications, search or admin.
- No AI-generated claims of official exam syllabi, admissions, placement, qualification, scholarships or guaranteed results without verified sources and user-review.
- Moderation is part of P0, not postlaunch cleanup. Accessibility, bandwidth resilience and language readability are acceptance criteria.
- Secure mentor-to-minor contact requires independent safety/policy review before enabling direct conversations.
- No cloud spend, production release or Play Store publishing through this approval. Android public release remains governed by CGN-287.

## 9. Source of truth and rollout approvals

- **Jira:** planned scope, owners, dependencies; **GitHub main:** implemented code; **versioned contracts / ADRs:** integration ownership; **Figma:** approved UI only when links/design review are actually present.
- CGN V2 Epic [CGN-289](https://sandeepagrahari1.atlassian.net/browse/CGN-289) coordinates new work and does not supersede older Epics. Architecture [CGN-290](https://sandeepagrahari1.atlassian.net/browse/CGN-290), UX [CGN-291](https://sandeepagrahari1.atlassian.net/browse/CGN-291), validation [CGN-292](https://sandeepagrahari1.atlassian.net/browse/CGN-292).
- Any change to career/roadmap/evidence event semantics, bounded-context ownership or student-sensitive data **needs its own Sandeep-reviewed ADR/contract ticket**, compatibility tests and migration/rollback plan. This PRD does not authorize schema changes.
- This product-direction approval enables discovery, alignment and design **not arbitrary bulk edits** of existing Jira descriptions or unfinished UI/backend.
- Next review: approve discovery findings, select first MVP vertical slice and validate Figma file/frame IDs before implementation tickets.

## 10. Out of scope / not yet proven

No runtime feature, API, exam content source, mentor network, 5,000-user production capacity, Figma frame or published Android build is represented as implemented by this PRD. Do not confuse "student ecosystem" market ambition with verified product-market fit.
