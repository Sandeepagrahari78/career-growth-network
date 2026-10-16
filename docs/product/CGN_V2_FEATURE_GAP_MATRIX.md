> **Document precedence:** **Supporting detailed audit**, not a second source of truth. Canonical all-31-Epic audit is [CGN_V2_FEATURE_GAP_AUDIT.md](CGN_V2_FEATURE_GAP_AUDIT.md); Jira remains live status/acceptance authority.

# CGN V2 — Existing vs New Feature Gap Audit

> **Snapshot:** Jira project CGN, reviewed 2026-10-16, **31 existing Epics**, baseline merged GitHub main \`1352de4f598041ca2865c36e838c8c06306e631e\`. Jira is the **live work truth**, so statuses below are a **snapshot** and may change. A feature being in an Epic does not imply implementation.
>
> **Decision:** The product owner reported three-member approval of the **Student Ecosystem V2 direction**. This mapping proposes exactly where requirements should be **kept, extended, added or deferred**; it does not edit these original Jira Epics yet.
>
> **Keep:** preserve intent. **Extend:** refine existing Epic's child tickets / acceptance. **Add:** new slice requiring new approved ticket/contract. **Defer:** not first pilot.

## 1. Complete existing Jira Epic mapping

| Epic | Actual existing focus | Proposed V2 action | Requirement delta / boundary |
| --- | --- | --- | --- |
| [CGN-5](https://sandeepagrahari1.atlassian.net/browse/CGN-5) | Platform Architecture | **EXTEND** | Review journey context, consent, personalization and ownership without making a second source of truth |
| [CGN-6](https://sandeepagrahari1.atlassian.net/browse/CGN-6) | Infrastructure as Code | KEEP | Local-first, cost gated; no new provider |
| [CGN-7](https://sandeepagrahari1.atlassian.net/browse/CGN-7) | Kubernetes Runtime | KEEP | Scale later with evidence; no national-market capacity claim |
| [CGN-8](https://sandeepagrahari1.atlassian.net/browse/CGN-8) | CI/CD GitOps | KEEP | Test new product/API/privacy contracts through existing gates |
| [CGN-9](https://sandeepagrahari1.atlassian.net/browse/CGN-9) | Observability Reliability | EXTEND | Journey-level observability, moderation/safety indicators |
| [CGN-10](https://sandeepagrahari1.atlassian.net/browse/CGN-10) | Security Privacy Compliance | **EXTEND** | Minors, educational data, mentor contact, goal-sharing permissions |
| [CGN-11](https://sandeepagrahari1.atlassian.net/browse/CGN-11) | Identity Access | **EXTEND** | One user identity, age-aware permissions, evolving stage |
| [CGN-12](https://sandeepagrahari1.atlassian.net/browse/CGN-12) | API Gateway BFF | KEEP | Versioned composition, not business truth |
| [CGN-13](https://sandeepagrahari1.atlassian.net/browse/CGN-13) | Career Track Ontology | **EXTEND** | Multi-purpose stage/goal taxonomy: exams, college, skills, career |
| [CGN-14](https://sandeepagrahari1.atlassian.net/browse/CGN-14) | Diagnostic Career State | **EXTEND** | Goal-type-specific onboarding and editable stage baseline |
| [CGN-15](https://sandeepagrahari1.atlassian.net/browse/CGN-15) | Growth Identity, Graph & Scoring | **EXTEND** | Track personal multi-journey history, distinct exam vs skill metrics, no cross-domain rank |
| [CGN-16](https://sandeepagrahari1.atlassian.net/browse/CGN-16) | Roadmap Next Best Action | **EXTEND** | Exam templates/custom-duration study plans alongside career plans |
| [CGN-17](https://sandeepagrahari1.atlassian.net/browse/CGN-17) | Task Execution Streaks | EXTEND | Study sessions, revision, breaks and shame-free rescheduling |
| [CGN-18](https://sandeepagrahari1.atlassian.net/browse/CGN-18) | Evidence Manual Proof | EXTEND | Self-reported mock tests/topic progress clearly labeled |
| [CGN-19](https://sandeepagrahari1.atlassian.net/browse/CGN-19) | GitHub Integration | KEEP | Useful to programming students; irrelevant to most exam users |
| [CGN-20](https://sandeepagrahari1.atlassian.net/browse/CGN-20) | AI Career Intelligence & Evals | EXTEND | Grounded plan adjustment, learning recommendation evaluations |
| [CGN-21](https://sandeepagrahari1.atlassian.net/browse/CGN-21) | Social Graph, Connections & Peer Matching | **EXTEND** | Opt-in goal/year/stage matching, safe block/contact rules |
| [CGN-22](https://sandeepagrahari1.atlassian.net/browse/CGN-22) | Cohorts Squads | EXTEND | NEET study circles, college squads, no forced peer count |
| [CGN-23](https://sandeepagrahari1.atlassian.net/browse/CGN-23) | Experts Validation | **EXTEND** | College seniors/MBBS mentor qualification and safe group guidance |
| [CGN-24](https://sandeepagrahari1.atlassian.net/browse/CGN-24) | Opportunities Matching | EXTEND P1 | Scholarships, course/career transitions; opportunities remain consent gated |
| [CGN-25](https://sandeepagrahari1.atlassian.net/browse/CGN-25) | Recruiter Platform | KEEP / DEFER | Preserve for college-to-career, not first NEET pilot |
| [CGN-26](https://sandeepagrahari1.atlassian.net/browse/CGN-26) | Notifications Weekly Report | EXTEND | Exam deadlines, user-controlled reminders and quiet hours |
| [CGN-27](https://sandeepagrahari1.atlassian.net/browse/CGN-27) | Admin Moderation Support | **EXTEND** | Mentor approval, syllabus/goal catalog curation, minor abuse reports |
| [CGN-28](https://sandeepagrahari1.atlassian.net/browse/CGN-28) | Social Home & Web Experience | **EXTEND** | Life-stage-adaptive web Home without making Home a study dashboard |
| [CGN-29](https://sandeepagrahari1.atlassian.net/browse/CGN-29) | Mobile Social Experience & PWA Core | **EXTEND** | Goal-context Android journeys; preserve platform ownership |
| [CGN-30](https://sandeepagrahari1.atlassian.net/browse/CGN-30) | Growth & Engagement Analytics | EXTEND | Action-based retention, pressure/wellbeing outcomes and safety |
| [CGN-31](https://sandeepagrahari1.atlassian.net/browse/CGN-31) | QA Performance Beta Launch | EXTEND | NEET/B.Tech pilot QA, minors, parity, non-coercive engagement |
| [CGN-262](https://sandeepagrahari1.atlassian.net/browse/CGN-262) | Social Growth Feed & Stories | **EXTEND** | Opt-in study progress and goal-specific story cards, privacy controls |
| [CGN-263](https://sandeepagrahari1.atlassian.net/browse/CGN-263) | Communities & Career Discussions | **EXTEND** | Exam/stage/college Q&A moderation templates |
| [CGN-264](https://sandeepagrahari1.atlassian.net/browse/CGN-264) | Messaging & Career Conversations | **EXTEND** | Age/mentor-aware eligibility, safer requests, block/report |
| [CGN-278](https://sandeepagrahari1.atlassian.net/browse/CGN-278) | Admin Operations, User Activity & 5K Capacity Readiness | EXTEND | Privacy-safe education-stage views + new event types; no raw DM exposure |

**Counts:** 31 Epics mapped; no old Epic removed, no child ticket auto-reassigned. Status and acceptance remain as actually recorded in Jira until owning ticket change. Existing confirmed shipped work is principally engineering/CI foundations; most product apps/services are **planned skeletons** on merged main.

## 2. New capability gaps that cannot be treated as already shipped

| V2 requirement | Newness | Existing context for integration | Required decision / first deliverable | Stage |
| --- | --- | --- | --- | --- |
| **Persistent Student Journey Context** | ADD / EXTEND | Identity + Career + Growth | Define stage/goal ownership and journey transition rules; contract RFC | P0 |
| Multiple concurrent goals | ADD / EXTEND | Career ontology + roadmap | Active context, goal state/status lifecycle, history and permission tests | P0 |
| Exam goal catalog | ADD | Career tracks + Admin | Exam/attempt-year/template taxonomy; data governance/versioning | P0 small set |
| **NEET syllabus/topics source** | ADD | Catalog + Roadmap | Licensed/current authoritative content, provenance, version and ownership | P0 small curated |
| Editable 30/60/100-day plans | EXTEND | Roadmap + AI | Duration templates without overriding 180-day career planning | P0 |
| Mock test/self-report + revision | ADD | Roadmap, Evidence + Growth | Evidence label, per-exam metrics, topic-level privacy defaults | P0 core, P1 advanced |
| Exam-stage peer matching | EXTEND | Social Graph + Career goal | Data minimization, consent, no forced connects, safety quality tests | P0 |
| Exam/stage community catalogs | EXTEND | Communities + Cohorts | Safe group categories, permissions and moderation | P0 |
| Verified college senior / mentor journey | EXTEND | Experts + Identity | Claims, qualification review, minor contact policy and admin queue | P0 moderated group Q&A |
| Social study progress card | EXTEND | Activity contract + Feed/Growth Stories | Approved source event semantics, opt-in visibility and deletion propagation | P0 |
| Cross-stage continuity UX | ADD | Identity + Growth + Social | Journey switcher, historical milestones, same account and connections | P0 |
| Mixed-stage personalized feed | EXTEND | Social Feed + AI orchestration | Context relevance, consent/block filters, user controls | P0 minimal |
| Safe minor/adult interaction boundary | **ADD / HIGH-RISK** | Identity consent + Social Graph + Messaging + Experts | Independent privacy/security policy and authorization tests | P0 blocker |
| Study time pressure/wellbeing protections | ADD | Daily missions + Feed/Notifications | Quiet hours, break day, marks private, comparison control | P0 |
| Goal-stage product analytics | EXTEND | Analytics + QA | Meaningful-action activation, D7/D30, safety monitoring | P0 |
| Universal exam banks + premium course delivery | DEFER | Undetermined content supply and rights | Research licensing and economics; no promise | P2 |
| Paid mentorship / recruiter monetization | DEFER | Experts, opportunities | Business/consent/legal case | P2 |

## 3. First pilot proposal (not an irreversible roadmap commitment)

**P0: one NEET-target-year cohort + B.Tech college-growth cohort**, selected after interviews. Shared infrastructure: one account, personalized Home, My Journey, opt-in peer suggestions, moderated communities, approved daily actions, privacy-safe progress cards, minimal mentor public guidance, safety/report/admin tools, web/Android parity for selected scenarios. P1 expands templates and qualified mentor capacity; P2 adds broad exams and marketplace.

**Why focused?** A national exam catalog is not just a dropdown: syllabus versions, expert verification, calendars, mock-test metrics, creator rights, mentors, age policies and moderation differ by pathway. Build a goal-template capability first, pilot real usefulness, then expand.

### Interview/testing before feature freeze

- 10–15 aspirants + 10–15 college students with appropriate consent; moderated research for minors.
- Explore daily pain points, available substitutes, usefulness of peer updates, comfort with sharing, exam-content trust, mentor preferences and privacy concerns.
- Prototype onboarding → Home → My Journey → optional peer connection → progress share; measure actual task completion, return actions and wellbeing, not only emotional FOMO or feed dwell.
- Track unknowns openly; avoid fabricated market sizing or guaranteed conversion estimates.

## 4. System ownership / no duplicated data

The existing [machine-readable domain ownership](../../packages/contracts/architecture/bounded-contexts.v1.json) is **unchanged**. Proposed review:

| Data / policy | Plausible owning context | Never do | Sign-off needed |
| --- | --- | --- | --- |
| Account, identity, age-consent flags | Identity | Copy student auth into Career/Mobile | Security / Sandeep |
| Goal, journey stage, educational taxonomy | Career (preferred *hypothesis*) | Duplicate goal truth per UI | Career owner / Sandeep |
| Timetable, tasks, revision schedule | Roadmap | Put plan truth in feed or AI | Roadmap owner |
| Test score evidence provenance | Evidence (candidate) | Treat self-report as verified official score | Evidence owner |
| Progress across paths | Growth | Universal rank JEE vs B.Tech | Growth owner |
| Connections / follow / block | Social Graph | Implement independent eligibility in Messaging | Social owner / Security |
| Content feed/status | Feed projections | Leak private metrics or deleted content | Feed owner / Security |
| Mentor qualifications/session | Experts | Self-verify qualification | Experts/Admin |
| Community membership/moderation | Communities | Bypass group/minor eligibility | Tanvi + Security |
| Analytics | Analytics aggregate | Admin access to raw private data | Privacy owner |

**Keep \`career.activity.v1\` unchanged** until an approved additive or versioned change defines exam activity semantics. The present PRD authorizes no new service, table, API route, event contract or database migration.

## 5. Web/Android scope

- Same private GitHub monorepo, same backend contracts.
- Next.js in \`apps/web/\`; Expo/React Native Android in \`apps/mobile/\`.
- Jira platform mapping [\`config/ci/ticket-platform-scopes.v1.json\`](../../config/ci/ticket-platform-scopes.v1.json) is a **manual offline registry** enforced on PR paths. V2 UI tickets must each have a reviewed platform mapping. Do not bypass with a giant cross-platform ticket.
- Design reference from Figma must have exact file/frame/version after visual approval; Google Stitch drafts are not themselves authority.
- Play Store launch stays separately gated by CGN-287; no account purchase/AAB upload.

## 6. Proposed handoff sequence after this approval

1. Complete this CGN-288 discovery/vision pack and merge reviewed docs.
2. **Journey & Contract RFC:** propose extension to Career/Roadmap/Growth ownership, age policy, versioned event semantics. Security, Sandeep and service owners approve before any contract code change.
3. **Student interviews/MVP gate:** validate initial pilot and document UX/access requirements; revise plan from evidence.
4. **Design system + Stitch/Figma review:** flows, responsive layouts, interaction/privacy/empty/error states. Start with onboarding, social Home, My Journey, NEET prep dashboard, safe peer/mentor discovery.
5. **Implementation child tickets:** assign precise owners, acceptance tests, existing contract and frame IDs, web/mobile scope and dependency links.
6. PRs per implementation ticket with handoffs and existing CI; do not claim features shipped before successful user QA.

## 7. Sources and limitations

- [Live Jira product Epics](https://sandeepagrahari1.atlassian.net/jira/software/projects/CGN/boards)
- [Current product north star](../engineering-memory/00-product-north-star.md)
- [Current module/domain ownership](../engineering-memory/02-domain-ownership.md)
- [Merged system map](../engineering-memory/01-system-map.md)
- [Current merged state](../engineering-memory/05-current-state.md)
- [Student Ecosystem V2 PRD](CGN_STUDENT_ECOSYSTEM_V2_PRD.md)
- [Architecture decisions to resolve](CGN_V2_ARCHITECTURE_DECISION_BRIEF.md)

**Status distinction:** Jira Epic = planned scope; green CI = validation for touched code; a V2 doc = agreed direction, **not** deployed student product.
