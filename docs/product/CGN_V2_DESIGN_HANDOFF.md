# CGN V2 — Product UX and Design Handoff

**Status:** Design brief approved as an execution direction, **screens not automatically approved**. No claim that design frames exist in Figma yet.  
**Project Jira:** [CGN-288](https://sandeepagrahari1.atlassian.net/browse/CGN-288)  
**Owners:** Prachi (design/web/Android), product owner (flow approval), Tanvi (trust/safety), Sandeep (integration contracts).  
**Source priority:** approved Figma frame/version → Jira ticket scope/acceptance → merged \`AGENTS.md\` and versioned contracts. Google Stitch output is a **draft generator**, not coding authority.

## 1. Navigation and cross-surface rules

### Website (Next.js, \`apps/web/\`)

- Desktop: left rail **Home / Explore / My Journey / Communities / Messages / Opportunities**, centre feed/content, right rail relevant upcoming missions, peers/mentors and upcoming milestones. App header has active journey switcher, search and notifications. Responsive tablet and narrow mobile web.
- Social-first Home is **not** an exam dashboard. Dedicated My Journey has work/plan content.
- User settings, Privacy/Safety, Community Admin and accessible Help/Reporting.
- Wide tables/charts may use desktop-specific arrangements but should not invent distinct business behavior.

### Android (Expo React Native, \`apps/mobile/\`)

- Bottom navigation: **Home | Explore | Journey | Chats | Profile**.
- Top bar active journey switcher + notifications; contextual access to Communities, Mentors and Opportunities.
- Touch-friendly cards, bottom sheets, accessible labels and safe-area/keyboard handling.
- Deep links, Android notification permissions, offline/error/retry states in relevant flows.
- Reuse shared brand tokens and API contract behavior; do not port a desktop sidebar literally to a phone.

## 2. Design system first

Provide semantic design tokens and reusable Figma components, with named properties and states rather than ad hoc duplicated shapes.

| Component set | Expected variants |
| --- | --- |
| Foundations | Color roles (light/dark planned), accessible contrast, typography scale, 4/8px spacing system, radii, elevation, grids |
| Navigation | Web sidebar/header, Android bottom nav, active goal switcher, mobile tabs/breadcrumb alternatives |
| Inputs | Text, OTP, select, combobox, multi-step goal wizard, date/duration selector, validation and disabled states |
| Social | Post, growth card, story rail, progress sharing privacy badge, comment, save, report, block |
| Discovery | Peer, mentor, college, community cards; safe connection request and verification status |
| Journey | Goal card, milestone, weekly plan, study topic row, revision state, mock claim, skills/project card |
| States | Skeleton, empty, error, offline, save success, restricted, permission denied, reported/removed content |
| Safety | Consent prompt, visibility settings, report sheet, block confirmation, minor-sensitive guarded interaction |
| Accessible UX | 44–48px touch targets, focus states, screen reader text, keyboard tab order, reduced-motion |

## 3. Suggested design batches and screen IDs

Screen IDs are **design planning IDs**, not Jira or implemented API identifiers. Each needs mobile and web where applicable, appropriate breakpoints and state variants.

| Batch | Screen inventory | Main interactions |
| --- | --- | --- |
| 00 — Foundations | DS-01 typography/colors; DS-02 components; DS-03 navigation; DS-04 states | Token/variant documentation |
| 01 — Identity/onboarding | ONB-01 welcome; 02 register/login; 03 age/consent; 04 education stage; 05 journey selection; 06 exam/degree goal; 07 target/time; 08 interests; 09 privacy; 10 first action | Branch by goal; skip optional steps; privacy state |
| 02 — Personalized social Home | SOC-01 main feed; 02 stories; 03 story viewer; 04 create post; 05 share progress; 06 comments; 07 activity detail; 08 report/block | Feed filtered by goal + consent; share audience |
| 03 — My Journey | JRN-01 overview; 02 journey switcher; 03 goal detail; 04 week calendar; 05 milestone details; 06 evidence upload; 07 history; 08 goal transition | Switch without losing unrelated history |
| 04 — NEET preparation pilot | PREP-01 prep overview; 02 subjects; 03 chapter tracker; 04 daily timetable; 05 focus task; 06 mock self-report; 07 weekly review; 08 custom-duration plan; 09 revision | Topic progress not public by default |
| 05 — B.Tech growth pilot | CAR-01 skills; 02 project portfolio; 03 internship prep; 04 roadmap; 05 achievements; 06 evidence details | Existing Career flow preserved |
| 06 — Peer and community | PPL-01 discovery; 02 peer profile; 03 request; 04 community list; 05 community feed; 06 Q&A; 07 study circle; 08 permissions | Opt-in connects; block/report |
| 07 — Mentors | MTR-01 verified mentor list; 02 profile; 03 qualification label; 04 moderated Q&A; 05 safety restrictions | No unrestricted minor-adult DM |
| 08 — Messaging | MSG-01 inbox; 02 chat; 03 requests; 04 group chat; 05 privacy/restrictions | Eligibility checked server-side |
| 09 — Opportunities | OPP-01 feed; 02 filters; 03 detail; 04 save/apply tracking | Context/consent-aware |
| 10 — Profile/settings | PRO-01 own profile; 02 growth timeline; 03 edit profile; 04 privacy; 05 quiet hours; 06 delete/export | Public/private boundaries |
| 11 — Admin/QA | ADM-01 moderation queue; 02 mentor verification; 03 goal catalog; 04 reports; 05 support; 06 safe audit | Sensitive data hidden/allow-listed |

**First implementation-ready design batch:** DS-01..04 + ONB-01..10 + SOC-01..08 + JRN-01..08 + PREP-01..09 + PPL-01..08 + MTR-01..05. Finish these core flows before polishing secondary modules.

## 4. Detailed exemplar flows

### NEET aspirant — from opening to value

\`\`\`mermaid
flowchart TD
 A["Signup / safe consent"] --> B["Education stage: Class 11"]
 B --> C["Goal: NEET, target attempt year"]
 C --> D["Choose time + current preparation stage"]
 D --> E["Privacy visibility defaults"]
 E --> F["Social-first Home"]
 F --> G["My Journey: NEET"]
 G --> H["Editable daily/weekly plan"]
 H --> I["Complete topic or task"]
 I --> J["Private growth state"]
 J --> K{"Share progress?"}
 K -->|No| L["Keep private"]
 K -->|Opt-in| M["Select audience"]
 M --> N["Progress story/feed card"]
 F --> P["Relevant peers / moderated Q&A"]
\`\`\`

### B.Tech student — skills/career context

\`\`\`mermaid
flowchart TD
 A["Education: B.Tech year + stream"] --> B["Select career / skill goal"]
 B --> C["Social Home: student/skill peers"]
 C --> D["My Journey: skills/projects/placements"]
 D --> E["Action / portfolio evidence"]
 E --> F["Growth achievements"]
 F --> G["Optional share + opportunities"]
\`\`\`

### Journey transition

User opens Journey switcher → add/change goal (e.g. NEET → MBBS) → show what remains archived vs active → confirm explicitly → update relevant recommendations and plan → **same account, relevant progress history and consent** remain.

## 5. Screen-level handoff template — mandatory per approved frame

\`\`\`yaml
screen_id: PREP-01
screen_name: NEET Preparation Overview
user_persona: Class 11 aspirant
platform: [web, android]
jira_issue: "CGN-NNN once assigned"
figma_file_key: "must be provided after review"
figma_frame_id_web: "must be provided after review"
figma_frame_id_android: "must be provided after review"
figma_approved_version: "must be provided after review"
entry_points: [My Journey, Home quick action]
primary_action: "Open/edit today's study plan"
secondary_actions: [subjects, mock tests, revision, goal settings]
privacy: "mock scores and study schedule private by default"
states: [loading, populated, empty, error, offline, restricted]
backend_contract: "approved owning-ticket versioned schema — not invented here"
acceptance: "goal context correct, privacy enforced, parity reviewed"
\`\`\`

The coding agent must not use an unapproved design draft as an authoritative API spec or silently replace a Figma frame. Frame URLs/version should be linked from Jira with acceptance criteria and GitHub handoff.

## 6. Master Google Stitch prompt for initial UX concepts

Copy this prompt into **Google Stitch** as a design exploration, then import/rebuild/approve relevant results in Figma. Do **not** treat the prompt as a guarantee that Stitch will create every screen or an exact machine-readable design file.

> Create an industry-quality, original, accessible **social-first education and career growth platform named CGN (Career Growth Network)** for students in India. It should feel like a trusted, optimistic student community and productivity ecosystem—not a generic online course shop, enterprise analytics admin dashboard or entertainment clone. Core value: students from after Class 10 through exams, college, projects and professional careers keep one identity with multiple evolving goals, authentic peer connections, optional verified mentors, private-by-default progress and practical personalized next actions.
>
> Design a coherent **responsive Next.js web app and native Expo/React Native Android app**, using the same design tokens and reusable components but appropriate navigation per device. Web: left navigation, social-first center feed, right contextual sidebar. Android: bottom navigation Home, Explore, Journey, Chats, Profile, plus active journey switcher.
>
> Create a premium accessible design system with functional typography hierarchy, spacing scale, authentic Indian names (fictional sample data only), detailed card and input variants, focus/skeleton/empty/error/offline/consent states. Do not use real student photos unless licensed/consented. Use a mature palette (slate/indigo/teal accents; not neon), large clean content surfaces, legible data charts and natural animations. Mark all generated content as example, not verified exams/real mentors.
>
> **Deliver screen families** in coherent page groups: (1) Welcome/login/recovery and age-sensitive consent, (2) adaptive onboarding selecting Class 11 NEET or B.Tech career journey, goal, year, time, interests and privacy, (3) personalized social feed with authentic progress cards, growth stories, comments, safety controls and relevant people, (4) My Journey with switchable goals, time-plan, actions, private milestones and persistent history, (5) NEET study overview with subject/chapter checklists, revision, mock self-report, custom-duration editable schedule and rest days, (6) B.Tech career skills/projects/portfolio/placements, (7) opt-in peer discovery, exam/stage communities and moderated Q&A, (8) verified mentor listing with qualification badges and restricted minor-adult contact, (9) messaging requests and safe chat, (10) notifications/quiet hours, profile, privacy, account deletion, and basic moderation interfaces.
>
> The **NEET aspirant** must see NEET topics, relevant same-stage community and MBBS mentor public guidance. The **B.Tech student** must see skills, projects, placement/industry network; they share a common visual system but not identical data views. Main signed-in Home remains social-first; planning/execution belong to Journey, not an unrelated dashboard.
>
> Generate both **desktop 1440px** and **Android 390px** concepts for the first five families, plus representative empty/error/accessibility states. Clearly label each artboard with IDs from \`docs/product/CGN_V2_DESIGN_HANDOFF.md\`. User progress visibility must be opt-in; avoid mandatory 30-friend follows, addictive streak-shaming, humiliation and public ranking of exam marks.
>
> Maintain a design-review sheet linking every proposed screen to its user action, data expectation, permissions and unanswered questions. Leave API fields, real mentors and official question bank claims as "requires contract/content verification".

## 7. Approval sequence / design source truth

1. Prachi reviews prior existing Figma product screens first; preserve approved components.
2. Generate or sketch initial concepts in Stitch/Figma; iterate user flow and non-happy-path states.
3. Sandeep/UX owner approve versioned Figma file and frame IDs. Tanvi signs off safety and community flows.
4. Add exact Figma references + screen spec links to relevant Jira child tickets; no invented links.
5. GitHub \`docs/product\` records **references**, tokens, component usage and approved decisions; Figma remains authoritative for approved UI.
6. Coding agents read current main, ticket scope, versioned contracts and approved Figma; split web/Android tickets according to CGN-286, attach before/after previews and responsive test evidence.
7. Design differences or missing contracts cause a blocked ticket/question, not silent assumptions.

**Current state:** This is a **complete design-planning brief and generative-tool prompt**, **not** a completed Figma prototype and **not** an implemented interface.
