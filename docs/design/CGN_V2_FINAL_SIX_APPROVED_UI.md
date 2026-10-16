# CGN V2 — FINAL six-screen visual specification (v1.0)

> **Approved visual direction by product owner:** 2026-10-16. **Jira:** [CGN-297](https://sandeepagrahari1.atlassian.net/browse/CGN-297), parent [CGN-289](https://sandeepagrahari1.atlassian.net/browse/CGN-289). **Design owner:** Prachi.
>
> **Asset state:** The **six exact original image files** are approved and preserved in the exported reference ZIP provided to the product owner. Binary upload of those six originals to this GitHub branch is **PENDING**; do not treat a named PNG file path in the JSON contract as an existing GitHub download until the file and SHA-256 checksum can be verified in GitHub. The connector in this session cannot upload arbitrary local binary bytes to GitHub or Jira. Visual-intent metadata is committed; completion requires binary upload and reviewed Figma alignment.
>
> **Precedence:** Six user-approved images define the intended appearance of the six primary Android screens. Existing 92-screen Figma native prototype is preserved as supporting detailed journeys, **not automatically an approved match** to the new appearance. Versioned service API contracts, security and Jira remain independent and enforceable.

## Fixed onboarding/navigation

**Email or Google authentication → one current-status selection → Home.**

The first-time status screen offers 11th, 12th, B.Tech, B.Sc, NEET Prep, JEE Prep, UPSC Prep, Other; extend catalog safely later. A returning user who already completed status selection goes directly Home. Underlying canonical stage and exam/career goals must be distinguishable (e.g., a Class 11 pupil can prepare NEET); don't model them as a mutually exclusive permanent identity. Adding/exploring a goal can happen in Journey, **without delaying first Home**.

After entering the app, **five persistent bottom navigation tabs** exactly: **Home | Explore | Journey | Chats | Profile**. Android bottom navigation is primary. On web, use a natural responsive rail/navigation but preserve the same five primary information-architecture destinations.

## Approved six PNG files — original content checksums

| UI | Screen | Approved original filename | SHA-256 |
| --- | --- | --- | --- |
| UI-01 | Current status | \`cgn_career_status_onboarding.png\` | \`66c38a0ebd672dfb81c487ee3031e2ead494dcbb7f0abe5c9999907c1fa4e70c\` |
| UI-02 | Home | \`cgn_student_social_feed_mockup.png\` | \`0276eb4a1fc7e9a5dd5174a3a6ef890b2fcc6b91da510868bf5167f4a9fee8c1\` |
| UI-03 | Explore | \`cgn_explore_connect_and_grow.png\` | \`ef219983e0945ed1da2ff16d961b8f670fcf0bbc87d1796ada0c4548c5b333f1\` |
| UI-04 | Journey | \`cgn_journey_dashboard_ui.png\` | \`e9d55a4de9e4c11e4f8079281f6bab09a09153e0473828209a17a61639bed542\` |
| UI-05 | Chats | \`cgn_chats_connect_learn_grow.png\` | \`aff80c71b37c1ab3315f409e8511d1d96bcf094c6567b7fa64e02c2b46b622d8\` |
| UI-06 | Profile | \`cgn_profile_aanya_s_growth_journey.png\` | \`89ea3e1b8313544aa03846b50c877e7e56d15f579aba8fc5d155ddbdaef1cdaf\` |

**Required GitHub destination for the binaries:** \`docs/design/approved-six-v1/images/<filename>\`. The complementary machine-readable UI contract is [\`packages/contracts/ui/cgn-v2-six-screen.v1.json\`](../../packages/contracts/ui/cgn-v2-six-screen.v1.json). The six filenames/checksums must match before implementation of UI pixel details is treated as fully unblocked.

## UI-01 — authentication → current status

**Appearance:** white, spacious onboarding; blue-purple CGN brand, selectable stage/preparation cards, Continue action. **Behavior:** sign in or register by approved Identity flow, select current position, save server-side, land in Home. No compulsory interests/goal/timetable/peer screens inserted after status selection. UX screenshot's step numbers are illustrative; product owner explicitly wants **single status page**.

**Jira:** CGN-11, CGN-70, CGN-291; Identity consent/age policy from CGN-290 before launch.

## UI-02 — social Home

**Appearance:** header, notification/chat indicators, horizontally scrolling circular peer Stories/Statuses; vertically scrolling posts with avatar, stage, Follow, caption/media, like/comment/save/share. **Behavior:** show relevant opt-in stories/posts based on current education status and active goals. Permit other relevant interests; relevance should not create filter bubbles or leak hidden marks. Follow status syncs across screens and count changes only after successful server operation. Stories may contain ordinary social content and consenting growth achievements, not mandatory study proof.

**Jira:** CGN-262, CGN-266, CGN-267, CGN-277, CGN-127. When no peers/stories are available, show honest recommendations, communities and an empty state; don't fabricate 15–40 active accounts.

## UI-03 — Explore

**Appearance:** search, filter chips, horizontal industrial-expert cards, suggested peers, and community cards. **Behavior:** current-status-relevant recommendations, expert public profile, Follow/Connection Request with pending/accepted/rejected state, safe Q&A and verified claim status from owning service. Privacy determines if following is immediate or requires approval.

**Jira:** CGN-21, CGN-23, CGN-169, CGN-188, CGN-192, CGN-296. Synthetic Google/Microsoft/Amazon logos and blue checks in generated mockups do **not** grant verification or imply those companies provide mentors.

## UI-04 — My Journey

**Appearance:** personal goal/progress card, Today Tasks, Weekly Plan, AI Plan Suggestions, Skill Roadmap, project milestones, placement/revision cards. **Behavior:** plan is editable; topic/task completions validated via owner, personal progress stays distinct per selected goal. For NEET/JEE, substitute subjects/revision/mock self-reports; for B.Tech, skills/projects/placements; preserve goal history when switching stages. AI suggestions are explainable and editable, not source of truth.

**Jira:** CGN-15, CGN-16, CGN-17, CGN-291, CGN-290.

## UI-05 — Chats

**Appearance:** peers/experts/groups filters with avatars, preview, timestamps, unread counts; fixed bottom bar. **Behavior:** only allowed conversations appear; request/accept, block/report, privacy, unread/notification counts and abuse handling enforced on server. No unrestricted adult–minor expert private messaging.

**Jira:** CGN-264, CGN-274, CGN-275, CGN-276.

## UI-06 — Profile

**Appearance:** personal banner, avatar, public bio, follower/following/post stats, personal growth progress, Posts/Achievements/Saved/Activity tabs, Edit Profile. **Behavior:** current position is visible/editable with appropriate visibility controls; user can publish posts, inspect their actual history and switch Journey goals. No fake streak/follower numbers on real accounts; private scores are never public by default.

**Jira:** CGN-15, CGN-105, CGN-163, CGN-175.

## Rules for agents and design reviews

1. Six approved reference images control **primary visual design**. Keep previous 92-screen Figma file as a prototype/detail inventory; don't delete it or assume it matches this new design.
2. A coding agent first reads latest merged \`main\`, live ticket status, \`AGENTS.md\`, existing source/architecture/contract ownership, this visual brief, the original images (after their binary upload), and ticket's approved current Figma frame.
3. **Images are NOT backend API contracts.** Never create \`POST /foo\`, new DB tables, services or cross-domain events just because a button exists on the screenshot. Use CGN-290 + owning service review to approve route/payload/authorization.
4. Identity, consent, Social Graph, Feed, Experts, Roadmap, Growth and Messaging retain canonical ownership. No duplicated web/mobile backend.
5. No unverified professionals or employers, fake followers/status, fabricated student achievements or pre-approved adult contact. This matters particularly for Class 11/12 students.
6. Approval of visual direction **does not mean the images are native editable Figma layers**, accessibility reviewed, backend connected, data licensed or Play Store ready.
7. Implement mobile and website in their **existing monorepo** with separate platform ticket scopes and shared versioned service contracts. Do not reset the engineering-memory/CI pipelines.

## Step-1/2 completion criteria and missing artifact

- [x] Visual direction and specific six filenames/checksums documented.
- [x] UI-intent JSON contract created under GitHub version control (not an API specification).
- [x] Jira task CGN-297 maps each UI to existing feature ownership; do not duplicate each old Epic.
- [ ] Upload and verify all six **original PNG binary assets** to the stated GitHub location or attach to canonical Jira issue, and link them here.
- [ ] Prachi reconciles exact approved image appearance against native Figma frames and explicitly stamps design version.
- [ ] Review responsive web variants, low connectivity, loading/error/accessibility and minor-safety states; actual backend implementation is separately ticketed.

**Do not mark the whole design or backend "Done" until these unresolved items are verified.**
