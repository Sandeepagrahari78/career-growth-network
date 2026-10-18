# CGN Android (Expo) — implementation foundation in progress

**Actual status (CGN-128):** product Android app not runnable yet. There is no installed Expo SDK or \`App.tsx\` and no live backend. The source in \`src/foundation\` is real, dependency-free navigation/HTTP logic exercised by Node contract tests; this is **not** a demo falsely representing signed-in users, posts or messages.

## Approved reference

- The exact six UI screen images and hashes are in [approved six-screen visual spec](../../docs/design/CGN_V2_FINAL_SIX_APPROVED_UI.md), merged by PR #33.
- The goal is **Google/email sign-in → single current-status picker → Home** and exactly five signed-in bottom tabs: **Home | Explore | Journey | Chats | Profile**.
- Existing domain/API owners, Jira and privacy review: [CGN-290 RFC](../../docs/architecture/CGN_V2_SIX_SCREEN_API_INTEGRATION_RFC.md).
- This feature slice is [CGN-128](https://sandeepagrahari1.atlassian.net/browse/CGN-128). No speculative routes or synthetic expert verifications.

## Existing code

- \`src/foundation/navigation.mjs\`: approved tab destinations, current-status options and safe auth/status/entry route resolver. This does not claim to store status on a server; Identity/Career approval still required.
- \`src/foundation/api-client.mjs\`: HTTPS-only authenticated fetch adapter, token provider, no redirect/cross-origin sending, clear unavailable/session/API errors. Endpoint path and response JSON are provided by approved **future** versioned owning-service contract, not hardcoded here.
- \`tests/contracts/mobile-v2-foundation.contract.test.mjs\`: structural + in-process actual HTTP transport tests. From repo root run \`node --test tests/contracts/mobile-v2-foundation.contract.test.mjs\`.

## Before marking CGN-128 complete

Build the real Expo React Native entrypoint, install/pin SDK dependencies and regenerate \`pnpm-lock.yaml\`, render accessible interactive views rather than flat screenshot PNGs, add status/login states, five-tab navigation, safe-area / Android device QA, and platform tests. These runtime tasks are **not complete** in this commit.

Use approved Identity session and stage/goal schemas from CGN-68/290/71/129, and separate Feed/Network/Roadmap/Messaging service contracts. Never make fake sample data look like real account state. The protected main source of truth includes only merged tested work.

- `src/foundation/status-gate.mjs`: UI-only status-save guard. It validates the approved visual choice and session twice, blocks duplicate submissions, and opens Home ONLY after an injected, approved owning-service adapter confirms persistence. It defines no API route, token format, Career schema, or backend implementation.
- `tests/contracts/mobile-v2-status-gate.contract.test.mjs`: eight fail-closed success/denial/race tests. Run `node --test tests/contracts/mobile-v2-status-gate.contract.test.mjs`.

**Still blocked:** The adapter must not return `true` until the Identity/Career owning service actually confirms the authorized, persisted stage/goal state. This module alone is not a working sign-in or production status-save flow.
