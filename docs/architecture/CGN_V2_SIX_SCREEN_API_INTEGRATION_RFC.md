# CGN V2 — Six Approved Screens: Cross-Service API Integration RFC

**Ticket:** [CGN-290](https://sandeepagrahari1.atlassian.net/browse/CGN-290) (Sandeep architecture/security owner).  
**Product/UI authority:** [exact six approved images and visual manifest](../design/CGN_V2_FINAL_SIX_APPROVED_UI.md) merged via [PR #33](https://github.com/Sandeepagrahari78/career-growth-network/pull/33).  
**Status:** **PROPOSED — NO NEW API ROUTE OR CONTRACT APPROVED BY THIS DOCUMENT.** Prachi's visual direction approval was reported by product owner 2026-10-16; it is **not** Sandeep's service ownership and minors-safety approval.

## Invariants

1. One GitHub monorepo: \`apps/web\` Next.js and \`apps/mobile\` Expo/React Native, one shared **approved** backend/service contract per domain.
2. One student account through changing school stage, exams, degree and career goals. **Current stage** (Class 11, 12, B.Tech, B.Sc etc.) and **preparation goal** (NEET, JEE, UPSC etc.) are not mutually exclusive facts; the approved status picker is a UX shortcut and must be mapped without data loss.
3. First-time user: **Google/email authentication → one current-status screen → Home**. Returning authorized user with current status: Home. Other optional interests/journey questions are not gates.
4. Home is social-first and permission-filtered; Journey is private execution/plan truth. Five signed-in tabs in order: **Home | Explore | Journey | Chats | Profile**. No other mandatory tabs.
5. Same consent and block decisions are respected by Feed, Social Graph, Messaging, Experts, notifications and profiles; no Android-only backend or duplicate service DB.
6. Contract ownership is established by [\`cgn.bounded-contexts.v1\`](../../packages/contracts/architecture/bounded-contexts.v1.json). **Do not** turn illustrative badge/company, scores, ranks, post counts or fabricated screenshots into production data.
7. Underage users: no unsolicited adult–minor expert DMs, automatic contact import, public raw marks, or precise schedule sharing. Account ages/guardian-consent implications require specialist review before activation.
8. No API success state until actual owning-service response is accepted; loading/errors, stale auth, partial content, offline and privacy-denied states mandatory. Real API integration must be tested end to end.

## Screen → owner → source Jira → contract requirement (not route invention)

| Approved screen | Owning service data/action | Jira task references | Required review/test |
| --- | --- | --- | --- |
| UI-01 Auth/status | **Identity** for email/Google session+consent; **Career** for stage/selected goals | CGN-68, CGN-69, CGN-71, CGN-13/14, CGN-290 | Server-verified OIDC/JWT, age gate; idempotent status-save; returning user skips status screen. Credential tokens never logged |
| UI-02 Home stories/posts | **Feed** owns permitted projection/ranking; **Social Graph** owns follow/block; comments from approved content/discussions owner; source progress from Growth/Evidence | CGN-266/267/277, CGN-156/168, CGN-262/263 | Opt-in content visibility; stage relevance without forced 15–40 fake status circles; real follow and like counts only after authorized responses; report/delete revocation |
| UI-03 Explore | **Social Graph** discovery, **Experts** verification, **Communities** membership | CGN-169/171, CGN-186/187/188, CGN-296 | Restricted/minor filtered discovery; follow→requested/accepted/declined/block per true relationship state. Credential badges sourced from verified admin state |
| UI-04 Journey | **Career** goal/stage, **Roadmap** plans/tasks, **Growth** progress, **Evidence** verified source; AI recommendation service only drafts editable suggestions | CGN-112/113/115/116/118/130, CGN-15/17/18, CGN-290 | Per-goal progress; no universal NEET-vs-B.Tech scores, hallucinated exam content, auto-mark-complete or raw marks sharing |
| UI-05 Chats | **Messaging** conversation/message/read truth; **Social Graph** block/contact eligibility; **Identity** age/consent | CGN-264/274/275/276, CGN-290 | Server-side authorization on every send/read; blocked/unknown/underage expert interactions denied; audit events without raw message bodies |
| UI-06 Profile | **Identity** profile visibility; **Growth** public-safe progress; **Feed** own posts; **Social Graph** counts; **Evidence** permissioned proof | CGN-105/161/163/175, CGN-168 | Only authorized public fields exposed; counts not fabricated; account controls, export/delete and per-post privacy respected |

## Decisions Sandeep must approve before service implementation

| Decision | Choice to make | Gate |
| --- | --- | --- |
| Stage/goal canonical model | What single Career object stores current stage, one or many goals, and transitions? | ADR or explicit CGN-290 decision; versioned schema, forward compatibility |
| Identity session | Which approved OIDC provider and token claims, refresh/logout, session recovery and minor consent check? | CGN-68 and security review; never accept client-supplied role/verification |
| Backend endpoint registry | Actual paths/methods, JSON schemas, error envelope, cursor pagination, idempotency and versioning | Owning service tickets + producer/consumer tests; **none defined by screenshot** |
| Peer contact | Does follow require approval based on privacy, minor age or mentor class? | CGN-156/168 + CGN-290 authorization policy |
| Home story source | Which activity type creates a story? What is permitted audience and deletion propagation? | Feed and Growth/Evidence approved event semantics |
| Expert validation/session | Separate "follow expert" vs "mentorship request", claims verification and limited session access | CGN-186/187/192, Tanvi, Sandeep |
| Message transport | Durable store, gateway auth and chat membership, unread delivery, socket lifecycle and block propagation | CGN-274/276 contract + concurrency, abuse and audit tests |
| AI | Provider budget, retrieval/evidence source, uncertainty, opt-in and safe suggestion editing | CGN-116 technical/evals and privacy sign-off |

**Enforcement principle:** feature teams don't get API authority simply because a Figma element is clickable. Jira approved acceptance + versioned \`packages/contracts\` schema + owning-service tests + merge to main authorize a **real** endpoint.

## Integration sequence for coding agents

\`\`\`mermaid
flowchart TD
  A["PR #33: Six approved visual PNGs and Figma links on main"] --> B["CGN-290: Sandeep approves stage/goal + safety/contract RFC"]
  A --> UI["CGN-128: Android shell + design/navigation + secure fail-closed HTTP client"]
  B --> ID["CGN-68/71/129: Identity login and real authorized status"]
  B --> SC["CGN-156/168: Social Graph relationship/block contracts"]
  B --> RD["CGN-112/118: Roadmap task/goal contracts"]
  B --> MSG["CGN-274/276: Messaging rights and durable event contracts"]
  ID --> INT["Frontend integrates service paths with typed schemas"]
  SC --> INT
  RD --> INT
  MSG --> INT
  UI --> INT
  INT --> CI["Security, contract, API, accessibility, Android + web test suite"]
  CI --> REV["Human QA, merge and controlled staging/beta"]
\`\`\`

### First executable slice / gate

**Unblocked before service contracts:** CGN-128 Android navigation/view-state skeleton and HTTP transport with no embedded tokens or hardcoded unapproved domain endpoints. It may be tested in isolation and should fail clearly when server auth/endpoints are absent. The six visual originals should be referenced, not pasted as flattened UI instead of semantic accessible components.

**Blocked without CGN-290:** real account/status writes, trusted follow state, messages to adults, personalized data feed/projections, verified mentor cards, booked sessions, AI promises. Do not deploy placeholder/sample data as if live.

### Definition of "fully connected"

All six UI states must be exercised against reachable, testable, independently approved owning-service APIs with authenticated test actors; 401/403/blocked/deleted/minor/offline/pagination/error coverage; real database persistence + migrations; audit, privacy propagation and reliability; approved staging; both Android and responsive web client compatibility. **Current repo mainly has CI/health-demo skeletons and does not yet meet this definition.**

## Explicit current status (2026-10-16)

- **Done:** six original image bytes fixed and hash-verified, PR #33 merged, screen intentions and domains mapped; GitHub CI foundation operational.
- **Human-reported:** Prachi approved the six-image direction.
- **Still pending:** Figma pixel-diff/accessibility device review (Starter Figma MCP tool call limit prevented independent verification); detailed domain API schema/CGN-290 review; product app/service source, DB, end-to-end APIs, real messaging, deployed student experience.
- **No new API shapes claimed in this RFC.**
