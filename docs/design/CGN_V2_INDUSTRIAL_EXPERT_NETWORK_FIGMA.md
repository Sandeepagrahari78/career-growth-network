# CGN V2 — Industrial Expert Networking · Live Figma UX Handoff

**Actual editable Figma screens CREATED** — 16 new Android-native frames added directly to the existing CGN V2 design file on **2026-10-16**. The prototype now contains **92** unique Android prototype frames (76 preexisting + 16 expert networking). **162 new navigation click actions** were wired in this work; a full structural QA scan found **862 linked actions, zero broken navigation destinations**, and **six intentionally self-referential current-tab/current-screen hotspots without a reaction**. The last point is not a broken destination; if the user requires all visual hotspots to animate, handle it separately.

**Figma:** https://www.figma.com/design/9lliKy1wnK8QFfTuBHmsZJ  
**Jira primary design scope:** [CGN-296](https://sandeepagrahari1.atlassian.net/browse/CGN-296) (Prachi, child of [CGN-23 Experts Validation](https://sandeepagrahari1.atlassian.net/browse/CGN-23))  
**Related design work:** [CGN-291](https://sandeepagrahari1.atlassian.net/browse/CGN-291) — V2 UI & cross-platform layout.  
**Product implementation:** **NOT DONE**; these are editable and clickable design **concepts**, not working backend services, real bookings, qualified mentors or client code. These new expert-specific frames **still need explicit Prachi/Tanvi/Sandeep visual/privacy/contract acceptance**.

## Screen inventory — directly linked native Figma frames

| Screen | Actual Figma frame | Purpose |
| --- | --- | --- |
| X-01 | [Industry Experts](https://www.figma.com/design/9lliKy1wnK8QFfTuBHmsZJ?node-id=21-2) | entry from Explore E-11 |
| X-02 | [Filter Experts](https://www.figma.com/design/9lliKy1wnK8QFfTuBHmsZJ?node-id=21-52) | domain and relevance filters |
| X-03 | [Expert Results](https://www.figma.com/design/9lliKy1wnK8QFfTuBHmsZJ?node-id=21-102) | safe discoverability results |
| X-04 | [Verified Expert Profile](https://www.figma.com/design/9lliKy1wnK8QFfTuBHmsZJ?node-id=21-158) | qualification labels; example only |
| X-05 | [Request Mentorship](https://www.figma.com/design/9lliKy1wnK8QFfTuBHmsZJ?node-id=21-211) | structured request and permissions |
| X-06 | [Request Status](https://www.figma.com/design/9lliKy1wnK8QFfTuBHmsZJ?node-id=21-254) | pending/request updates |
| X-07 | [Expert Office Hours](https://www.figma.com/design/9lliKy1wnK8QFfTuBHmsZJ?node-id=21-304) | fictional availability, no live booking |
| X-08 | [Session Details](https://www.figma.com/design/9lliKy1wnK8QFfTuBHmsZJ?node-id=21-357) | eligibility and session review |
| X-09 | [Session Confirmation](https://www.figma.com/design/9lliKy1wnK8QFfTuBHmsZJ?node-id=21-407) | fictional confirmation only |
| X-10 | [Mentorship Inbox](https://www.figma.com/design/9lliKy1wnK8QFfTuBHmsZJ?node-id=21-457) | requests and follow-ups |
| X-11 | [Expert Q&A & Resources](https://www.figma.com/design/9lliKy1wnK8QFfTuBHmsZJ?node-id=21-507) | moderated public guidance |
| X-12 | [Mentorship Feedback](https://www.figma.com/design/9lliKy1wnK8QFfTuBHmsZJ?node-id=21-557) | quality and report flows |
| X-13 | [Become an Expert](https://www.figma.com/design/9lliKy1wnK8QFfTuBHmsZJ?node-id=21-610) | expert application |
| X-14 | [Expert Verification](https://www.figma.com/design/9lliKy1wnK8QFfTuBHmsZJ?node-id=21-660) | Admin-review status |
| X-15 | [Expert Dashboard](https://www.figma.com/design/9lliKy1wnK8QFfTuBHmsZJ?node-id=21-713) | approved expert actions |
| X-16 | [Expert Safety Center](https://www.figma.com/design/9lliKy1wnK8QFfTuBHmsZJ?node-id=21-763) | contact restriction/reporting |

There are no fake or guessed Figma IDs in this table; each frame ID is returned by the connected Figma design operation.

## User journeys in Figma Present

1. Existing **Explore → [E-11 Mentor Discovery](https://www.figma.com/design/9lliKy1wnK8QFfTuBHmsZJ?node-id=15-482) → X-01 Industry Experts**. The E-11 entry was extended with a new clickable CTA, rather than replacing its original screen.
2. **X-01 → X-02 Filters → X-03 Results → X-04 Expert Profile → X-05 Request → X-06 Pending → X-10 Inbox**. These are examples; actual request status must be server-owned.
3. **X-04 → X-07 Office Hours → X-08 Session Details → X-09 Confirmation → X-12 Feedback**. No live session is confirmed or offered. Prototype dates and mentor names are fictional.
4. **X-01 → X-13 Become an Expert → X-14 Verification → X-15 Expert Dashboard**, subject to admin identity/credential review.
5. **X-04 / X-11 → X-16 Safety Center → existing C-07 minor contact restriction or C-08 reporting**. Adult–minor unsolicited direct messaging is not authorized.

The persistent **five bottom tabs** Home / Explore / Journey / Chats / Profile link to the original CGN V2 destinations throughout these 16 frames.

## Exact old/new feature mapping

| Existing approved planning | V2 expert extension proposed | Next owner and technical gate |
| --- | --- | --- |
| CGN-23 Experts Validation | Trusted, career/goal-aware discovery | Tanvi verifies mentor operations; Prachi reviews UX |
| CGN-186 Expert Service schema | Credential status, expertise, session/office-hour availability contract | Owning service review + Sandeep security/architecture sign-off |
| CGN-187 Expert approval | Application, admin validation, rejection and audit states | Tanvi/admin; no self-verification |
| CGN-188 Expert profile UX | Identity-verified versus self-reported expertise, policy disclosure | Tanvi expert ownership + Prachi implementation review |
| CGN-192 Validation request UX | Request → pending/accepted/declined with eligibility | Prachi; contract-authorized student/expert roles |
| CGN-21 Social Graph | Connection request/follow/block ownership | Prachi Social Graph, no duplicate expert relationship table without ADR |
| CGN-264 Messaging | Consent/age aware contact eligibility | Prachi + Sandeep; **restricted minor/adult private DM** |
| CGN-27 Admin moderation | Fraud, impersonation and harmful advice report queues | Tanvi; audit and revocation |
| CGN-290 Journey / contracts | Goal-based expert recommendation signals and privacy filtered response | Sandeep RFC before adding new API schemas |

### Business rules/requirements still open for approval

- What counts as verified expertise (identity, degrees, institution status, professional claims); renewal and revocation?
- Which learner ages may send requests, book sessions or message adults; who can consent and what must be moderated?
- How are time zones, availability, cancellations, meeting links, no-show and dispute/audit handled?
- Who owns a student–expert relationship compared with the canonical Social Graph follow/connection?
- Can expert advice appear in personalized Feed or a learner's Journey, and under which privacy/consent filters?
- Are any mentoring services paid? **No monetization or real payment is authorized.**
- How are advice quality, safeguarding response and user feedback enforced beyond a visually attractive frame?

**Do not invent API endpoints, database tables, event payloads, paid mentor calendars or direct communication policy solely from this Figma work.**

## Design QA and implementation gate

- **Verified:** 16 new editable frames with normal text/shapes, named `GO:X-NN` and `NAV:...` hotspots; Figma screenshots examined for Expert Hub, profile, office hours and safety. All 92 screen routes survive creation.
- **Verified:** original 76-screen prototype remained intact. 862 working actions in structural scan; zero destination IDs missing.
- **Pending:** polished real responsive desktop web expert screens; tablet, Hindi copy, WCAG review, screen reader/keyboard, device safe areas, privacy/empty/loading/error/declined states for each flow, real end-to-end prototype test by human, original historic Figma integration and independent three-member acceptance.
- **Before coding:** Jira feature-specific ticket, approved Figma version/frame, signed privacy rules, owning-service versioned API contracts, UX acceptance and QA. Separate web and Android platform Jira scopes under CGN-286 guardrail.
- **Repo:** GitHub `main` remains actual **implementation** truth; this document is a **design reference PR** and must not be equated with implemented product features.

## Follow-on sequence

Prachi reviews/design-polishes the 16 frames and maps their website equivalents; Tanvi reviews expert verification, credential revocation and safety; Sandeep resolves contracts in CGN-186/290; then prepare distinct implementation tickets. Only reviewed frames go into coding-agent context packs.
