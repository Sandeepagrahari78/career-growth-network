# CGN V2 — Figma Concept Batch 01 · Actual editable frames

> **Design review status: DRAFT — NOT APPROVED FOR IMPLEMENTATION.** This is the **historical first 14-frame batch**, not the current total. The Figma file now contains **92 native Android prototype screens** (76 base + 16 Industrial Experts). See [new expert Figma frame catalog](CGN_V2_INDUSTRIAL_EXPERT_NETWORK_FIGMA.md) and [full navigation inventory](CGN_V2_76_SCREEN_NAVIGATION_PLAN.md).
>
> Owner: Prachi · [Jira CGN-291](https://sandeepagrahari1.atlassian.net/browse/CGN-291) · Created 2026-10-16 in connected Figma. These are *real editable design frames* with fictional sample data, not deployed UI, Google Stitch exports, production components, approved API schemas, or independently approved UX.

**[Open CGN V2 Design System + Web/Android Concepts in Figma](https://www.figma.com/design/9lliKy1wnK8QFfTuBHmsZJ)**

## 1. What is actually drawn

Three Figma pages (current Starter plan permits 3 pages). A future review can reorganize content after plan/access changes without disturbing historic Figma designs.

| Section | Source of truth and actual editable content |
| --- | --- |
| Foundations | [Semantic colors, type, component starters](https://www.figma.com/design/9lliKy1wnK8QFfTuBHmsZJ?node-id=2-28) — light-mode color/spacing/radius variables, typography styles, button/chip/base-card/progress components |
| Review states | [Loading, no-peer, restricted mentor, offline + approval gates](https://www.figma.com/design/9lliKy1wnK8QFfTuBHmsZJ?node-id=7-2) — placed under the Foundations page because of 3-page Starter limit |
| Desktop | Six **1440 × 900** web-oriented concepts (Next.js UI intent, not app code) |
| Android | Eight **390 × 844** Android-native concepts (Expo React Native UI intent, not app code) |

### Desktop web screens — exact frame links

| Screen | Preview/description | Figma frame |
| --- | --- | --- |
| ONB-01 | Multi-journey choice, opt-in context | [Web onboarding](https://www.figma.com/design/9lliKy1wnK8QFfTuBHmsZJ?node-id=3-3) |
| SOC-01 | **Social-first** Home; story circle, two peer posts, actions, matching | [Web social Home](https://www.figma.com/design/9lliKy1wnK8QFfTuBHmsZJ?node-id=3-61) |
| JRN-01 | NEET active goal, journey history, goal switch, private metrics | [Web My Journey](https://www.figma.com/design/9lliKy1wnK8QFfTuBHmsZJ?node-id=3-149) |
| PREP-01 | NEET 100-day *editable* plan, subjects, private self-reported mocks | [Web NEET prep](https://www.figma.com/design/9lliKy1wnK8QFfTuBHmsZJ?node-id=3-220) |
| PEER-01 | Optional same-stage matches, moderated guidance and communities | [Web peer discovery](https://www.figma.com/design/9lliKy1wnK8QFfTuBHmsZJ?node-id=3-291) |
| CAR-01 | B.Tech skills/projects/industry connections and evidence | [Web B.Tech growth](https://www.figma.com/design/9lliKy1wnK8QFfTuBHmsZJ?node-id=3-364) |

### Android screens — exact frame links

| Screen | Preview/description | Figma frame |
| --- | --- | --- |
| ONB-01 | Education-stage selection | [Android stage](https://www.figma.com/design/9lliKy1wnK8QFfTuBHmsZJ?node-id=4-3) |
| ONB-03 | NEET/JEE/B.Tech/other goal picker | [Android goal](https://www.figma.com/design/9lliKy1wnK8QFfTuBHmsZJ?node-id=4-42) |
| SOC-01 | Social Home, stories, peer progress, relevant CTA | [Android Home](https://www.figma.com/design/9lliKy1wnK8QFfTuBHmsZJ?node-id=4-84) |
| JRN-01 | Current NEET goal and private subject progress | [Android My Journey](https://www.figma.com/design/9lliKy1wnK8QFfTuBHmsZJ?node-id=4-137) |
| PREP-01 | Private editable daily study plan with recovery time | [Android NEET plan](https://www.figma.com/design/9lliKy1wnK8QFfTuBHmsZJ?node-id=4-183) |
| PEER-01 | Optional peers and moderated senior Q&A | [Android peers](https://www.figma.com/design/9lliKy1wnK8QFfTuBHmsZJ?node-id=4-235) |
| CAR-01 | B.Tech skills, projects and portfolio evidence | [Android career](https://www.figma.com/design/9lliKy1wnK8QFfTuBHmsZJ?node-id=4-283) |
| MTR-02 | Restricted minor–adult messaging and public Q&A fallback | [Android mentor safety](https://www.figma.com/design/9lliKy1wnK8QFfTuBHmsZJ?node-id=4-326) |

Figma frame URLs and IDs above were retrieved from the actual file after creation. Screens were visually inspected using rendered Figma screenshots; the **onboarding and social Home** are readable. Full cross-device functional/prototype testing, interaction links and localization audit are **not** complete.

## 2. Draft design foundations

- **Light token colors:** primary #4A51D4, teal #079FA3, canvas #F6F8FC, surface #FFFFFF, primary ink #17223B, muted #61708D, border #E1E7F2, success #16815D.
- **Text styles:** Inter display 36, title 24, heading 18, body 15, caption 12.
- **Spacing:** 4/8/12/16/24/32. Radius 8/14/20 and pill. Example actions are 46–48px high.
- **Local Figma components:** Primary/Secondary/Tonal Button, active GoalChip, Base Card, Progress Track. Color variable bindings applied to component surfaces; web/Android implementations have **not** adopted these tokens.
- **Web navigation:** left nav, social-first middle feed, right contextual rail; Journey acts as execution workspace.
- **Android navigation:** Home / Explore / Journey / Chats / Profile. Avoid simply shrinking the web sidebar.
- **Brand/direction:** optimistic, professional, distinct study-and-social ecosystem; avoid compulsory peer follows, unsafe mentor contact and public mock scores.

## 3. Screens, component and state work still needed

This is **first batch**, not all ~100 proposed routes, and the components are a **starter library**, not a verified production-grade component set. Before design approval:

1. **Prachi** compares original existing Figma assets (no old file link was provided/verified), resolves brand/type/layout differences and confirms reusable component approach.
2. Complete on-device/small Android and web/tablet responsive variants, Hindi/English wrap, accessible focus/keyboard/reader order, color contrast and tap sizes.
3. Create real interaction/prototype links: onboarding selection → social Home → Journey → task completion → optional visibility/share → consented peer interaction.
4. Audit **loading, empty, offline, error, blocked, private, minor/adult restricted and delete** states for each screen; current review boards are representative only.
5. Create remaining screens (messaging, communities, mentor directory, privacy, profile, opportunities, admin and full goals). Do **not** misstate 14 example frames as a complete ~100-screen design.
6. **Sandeep** resolves [CGN-290](https://sandeepagrahari1.atlassian.net/browse/CGN-290) domain/contract and safety questions before UI API implementation; **Tanvi** reviews safety and [CGN-292](https://sandeepagrahari1.atlassian.net/browse/CGN-292) research.
7. After explicit approval, add each approved **frame link + design version + acceptance states + owning API contract + Jira platform mapping** to the implementation ticket. `CGN-286` PR platform path guardrail remains mandatory.

## 4. Figma vs Stitch and implementation truth

- Designs were created **directly and editably in connected Figma**; Google Stitch was **not** used. The [master Stitch prompt](CGN_V2_DESIGN_HANDOFF.md) remains useful for further concept exploration.
- **Figma design status is DRAFT.** Do not claim that Prachi or the whole team approved these frames.
- Jira: owner, requested feature scope and workflow.
- GitHub merged main: code, engineering truth and versioned API contracts.
- Approved Figma frame/version: reviewed design intent **only once approved**.
- Existing web and Android apps remain skeletons until separate implementation tickets and tests.

## 5. Review checklist and handoff

**[Jira CGN-291](https://sandeepagrahari1.atlassian.net/browse/CGN-291)** should remain **In Progress** pending Prachi's review and the remaining screens/variants, not Done. Requested review outcomes: **approve direction**, **request design changes**, or **replace after comparing existing Figma**.

All people/content are fictional examples. Sample mentor qualification is illustrative, **not** real verification. No student account/private contact data was uploaded, and no product APIs, DB migration, store submissions or cloud costs changed.
