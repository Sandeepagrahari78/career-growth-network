# CGN V2 — Team Execution Roadmap and Decision Register

**Vision direction:** approved by team as reported by product owner (2026-10-16).  
**Requirements and UI detail:** accepted only through subsequent per-ticket review.  
**Product-code status:** V2 not yet implemented; prior GitHub Engineering Memory and CI remain source of truth.

## Workstreams created on Jira

| Jira | Owner | Scope | Gate |
| --- | --- | --- | --- |
| [CGN-288](https://sandeepagrahari1.atlassian.net/browse/CGN-288) | Sandeep | Vision PRD, gap audit, technical and design handoff planning | Planning documents are traceable and PR-reviewed |
| [CGN-293](https://sandeepagrahari1.atlassian.net/browse/CGN-293) | Sandeep | **RFC:** Journey/goal owner, exam data contracts, cross-service events, minors' consent and mentor eligibility | Signed ADR, schema proposal + privacy/contract tests BEFORE backend code |
| [CGN-294](https://sandeepagrahari1.atlassian.net/browse/CGN-294) | Prachi | Preserve/review old Figma; new component library, UX flows and web+Android screen variants using Stitch drafts | Human-approved Figma file/frame/version URLs + interactive prototypes |
| [CGN-295](https://sandeepagrahari1.atlassian.net/browse/CGN-295) | Tanvi | Validate NEET and B.Tech pilot, real interviews, mentor/community safety and meaningful retention | Documented evidence, consent process, revised MVP definition |

## Recommended order

\`\`\`mermaid
flowchart TD
 A["CGN-288: V2 PRD + gap audit (vision direction approved)"] --> B["CGN-293: Journey architecture + safety RFC"]
 A --> C["CGN-294: Stitch/Figma design exploration"]
 A --> D["CGN-295: Pilot and research validation"]
 D --> E["Select and freeze pilot MVP"]
 B --> E
 C --> F["Figma approved frames/components"]
 E --> F
 F --> G["Create exact Jira UI/API implementation child tickets"]
 B --> G
 G --> H["Ticket-context → agent code → tests → handoff → PR CI → main"]
\`\`\`

Research and design can run **in parallel**, but no coding agent may infer new endpoints or minors' permissions from a beautiful prototype alone. Any new cross-domain contract requires approved owner decision.

## First 5 design packages — implementation handoff ready only after design approval

1. **Identity/onboarding:** education stage, goal selection, consent/privacy and first action.
2. **Social Home:** peer progress stories, relevant communities, safe sharing and moderation actions.
3. **My Journey:** multi-goal context switcher, NEET/B.Tech-specific current actions and historical progress.
4. **NEET pilot preparation:** subject/topic tracker, editable study timetable, self-reported mock scores and rest days.
5. **Discovery/mentorship:** optional peers, groups and verified guidance; minor/adult interactions restricted.

Full screen inventory and Google Stitch master prompt: [CGN_V2_DESIGN_HANDOFF.md](CGN_V2_DESIGN_HANDOFF.md). This file is design specification—not a Figma frame collection.

## Approval gates & explicit unknowns

| Gate | Explicit decision to obtain | Who |
| --- | --- | --- |
| Journey ownership | Existing Career versus new bounded context | Sandeep and owning backend |
| Content | Reliable/current and licensed NEET topic definitions | Career/Admin/Tanvi |
| Personal data and minors | Consent model, DMs, mentor verification, public visibility and deletion | Sandeep/Tanvi; legal review |
| Pilot scope | Actual student demand, sample, age brackets and benefit metrics | Product team / Tanvi |
| Figma | Existing assets reused and exact approved frames for both platforms | Prachi / Sandeep |
| Implementation | Exact Jira ticket, API contracts, tests, Jira platform mapping | Ticket owner / Sandeep |
| Release | User testing, safety, staging, cloud/Play Store costs | Release owner |

## Success signals, not invented targets

- Activation: completed first useful goal-related task within seven days.
- Return: D7/D30 **meaningful** study/growth actions, not scroll duration.
- Quality: voluntary relevant peer connections, useful moderated mentor replies.
- Continuity: users change education/goals without losing account and authorized history.
- Safety: low harmful-contact rates, reliable report handling, student pressure/wellbeing feedback.
- Scalability: existing beta account objective is not a concurrent load guarantee; measure with real product workloads.

No guarantees of 100% retention, 1% Indian market share, exam rank, career outcomes or investor valuation.

## What is NOT authorized by the reported approval

- Editing or closing the existing 31 product Epics en masse.
- Modifying \`packages/contracts/architecture/bounded-contexts.v1.json\` or inventing API/event fields without CGN-293.
- Turning a Stitch-generated draft into authoritative Figma design without approval.
- Registering minors or enabling unrestricted DMs before consent and safety review.
- A paid cloud plan, real public launch, Apple App Store support or Google Play registration.
- Calling the current product skeletons a deployed platform.
