# CGN V2 — 76 Screen Navigation & Prototype Build Map

**STATUS:** navigation content and standalone HTML demonstration implemented; **complete native Figma prototype remains pending**. User supplied an older CGN UI flow and Instagram feed/bottom-nav reference on 2026-10-16, and reports Prachi approved the updated five-tab direction. Neither the uploaded screenshots nor this document authorizes unsafe peer or mentor behavior.

**Live editable Figma draft:** https://www.figma.com/design/9lliKy1wnK8QFfTuBHmsZJ  
**Owner:** [CGN-291 — Prachi](https://sandeepagrahari1.atlassian.net/browse/CGN-291)  
**Prior design links:** [First batch of 6 desktop + 8 Android concepts](CGN_V2_FIGMA_CONCEPT_BATCH_01.md)

## Primary interaction contract

Mobile bottom bar: **Home → Explore → Journey → Chats → Profile**, persistent on all signed-in mobile screens. Every tab navigates to its section root. Android bottom bar is screen-fixed, ergonomic and touch-size accessible. Onboarding has its own sequential flow and no mandatory social connections. Desktop reuses the same product information architecture with left rail and contextual right column, not a stretched Android layout.

Home screen must feel familiar to users of story/feed platforms: story rings, social posts, comments, educational short-video entry, post creation and notifications. It is **not** a forced public rankings or addictive FOMO machine. Content should center on genuine student progress, projects, social interactions and goal-based communities, with visibility consent.

## 76 destinations — build/review inventory

| Section | Count | Screen IDs and purposes |
| --- | ---: | --- |
| **Onboarding** | 8 | O-01 Welcome; O-02 Join; O-03 Education stage; O-04 Goal selection; O-05 Target year; O-06 Interests; O-07 Consent/privacy; O-08 Finish |
| **Home & social** | 12 | H-01 Home feed; H-02 Stories; H-03 Story viewer; H-04 Create post; H-05 Post detail; H-06 Comments; H-07 Share progress; H-08 Growth Reels; H-09 Video details; H-10 Saved posts; H-11 Notifications; H-12 My circle |
| **Explore & connections** | 15 | E-01 Explore root; E-02 Search; E-03 Search results; E-04 Suggested peers; E-05 Peer profile; E-06 Connections; E-07 Communities; E-08 Community feed; E-09 Discussion; E-10 Study squad; E-11 Mentor discovery; E-12 Mentor profile; E-13 Moderated mentor Q&A; E-14 Opportunities; E-15 Opportunity details |
| **Journey & preparation** | 19 | J-01 My Journey; J-02 Switch; J-03 Add goal; J-04 NEET dashboard; J-05 Subjects; J-06 Chapter; J-07 Timetable; J-08 Daily missions; J-09 Mocks; J-10 Log mock; J-11 Revision; J-12 Weekly review; J-13 Growth timeline; J-14 Share milestone; J-15 B.Tech journey; J-16 Skills roadmap; J-17 Projects; J-18 Portfolio; J-19 AI plan assistant |
| **Chats & safety** | 9 | C-01 Chats root; C-02 Peer chat; C-03 Requests; C-04 Group chat; C-05 Moderated Q&A; C-06 Controls; C-07 Restricted mentor contact; C-08 Report/block; C-09 Conversation info |
| **Profile & preferences** | 13 | P-01 Profile root; P-02 Edit profile; P-03 Achievements; P-04 Connections; P-05 Saved; P-06 Settings; P-07 Privacy; P-08 Notifications; P-09 Blocked; P-10 Safety; P-11 Help; P-12 Data and deletion; P-13 Change education stage |

**Total: 8 + 12 + 15 + 19 + 9 + 13 = 76 distinct route specs**. More component variants/loading/empty/error/blocked flows are needed to reach full acceptance. Several routes are P1/P2 scope; placement in the visual prototype does not move them to P0 implementation.

## Key clickable example journeys

1. O-01 → O-02 → O-03 → O-04 → O-05 → O-06 → O-07 → O-08 → H-01.
2. H-01 → H-02 → H-03 → H-05 → H-06, with story-sharing H-07 and media H-08 → H-09.
3. H-01 → J-01 → J-04 → J-05 → J-06 → J-07 → J-08 → J-12 → J-13 → J-14 → H-07.
4. J-01 → J-02 → J-15 → J-16 → J-17 → J-18 → E-14.
5. H-01 → E-01 → E-04 → E-05 → E-06; E-07 → E-08 → E-09 → C-05.
6. E-11 → E-12 → C-07 (restricted private contact) → E-13 (moderated Q&A).
7. C-01 → C-02 → C-09 → C-06 → P-07; P-01 → P-06 → P-07 / P-08 / P-10 / P-12.

### Safety UX requirements

- Under-18 students: age-aware consent and contact restrictions, blocked/report flows, no unrestricted adult mentor DMs, privacy-first progress and marks.
- Peer discovery: voluntary, same-stage suggestions; no required 30 connections, no public exam rank across unrelated goals.
- Narratives/stories/reels: user-generated content needs moderation/reporting and consent; original Instagram screenshot is **layout inspiration only**, not content/logo to copy.
- AI suggestions: editable, labeled as uncertain; actual API/contract ownership pending [CGN-290](https://sandeepagrahari1.atlassian.net/browse/CGN-290).

## Exact delivery honesty and next handoff

- Figma currently includes **20 new native Android prototype-target frames** (8 onboarding and 12 Home/social) created in the connected file *in addition* to the previous 14 draft concepts. These 20 are **NOT yet linked with functional Figma prototype reactions**.
- Additional Figma writes to generate remaining Explore/Journey/Chats/Profile screens failed with the Figma editing tool reporting an internal error. Read-only metadata verified 20 newly created frames and no failed-batch duplicates.
- A separate **76-route standalone HTML/CSS/JS interactive preview** was built and browser-tested with Home/Explore/Journey/Chats/Profile navigation, like, task completion and example chats, plus screen-map JSON and ZIP. The preview was delivered as conversation artifacts; **it is not the native editable Figma prototype** and has no real production backend.
- Keep [CGN-291](https://sandeepagrahari1.atlassian.net/browse/CGN-291) **In Progress**, and PR documentation in review. Do not assert Figma full completion, approved Figma link per 76 screens or deployed feature parity.
- To resume: restore Figma writing; build missing 56 native frames in small safe batches, wire `ON_CLICK/NAVIGATE` for all five tab targets plus each feature CTA; configure onboarding prototype starting point; test reachable flows in Figma Present, accessibility and screen-state variants; get Prachi's final 76-frame signoff before treating links as implementation authority.
