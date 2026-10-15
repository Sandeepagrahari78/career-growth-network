# CGN Android Google Play publication — readiness checklist

**Jira:** [CGN-287](https://sandeepagrahari1.atlassian.net/browse/CGN-287), Prachi, parent CGN-29. This is a **planning and evidence checklist**, not authorization to pay fees, open accounts, submit app files or make production deployments. CGN-251 remains a **separate** zero-budget internal APK / Expo Go beta distribution ticket. iOS / Apple App Store is out of scope.

## Technology and architecture

- Repo: single `career-growth-network` monorepo.
- Web: `apps/web/` → Next.js/React/TypeScript (planned).
- Android: `apps/mobile/` → Expo/React Native/TypeScript (planned).
- Shared backend: `services/` versioned APIs/contract ownership; `packages/contracts/` for shared data shapes. **One Identity/consent source of truth** for both.
- Current apps are **skeletons**, not yet installed/running production features. Backend/SDK target selection is owned by CGN-128/129 and actual downstream tickets.

## Before a public Google Play release

- [ ] Approve developer account legal owner and budget. Public distribution via Play Console currently has one-time **US$25 fee**; no account registration or spending under existing ₹0 constraint without Sandeep's explicit authorization. Source: https://support.google.com/googleplay/android-developer/answer/6112435
- [ ] Confirm latest Google policy close to release. As of **2026-10-15**, new standard Android mobile apps submitted from **2026-08-31** must target **Android 16 / API 36+**. Source: https://support.google.com/googleplay/android-developer/answer/11926878
- [ ] Produce signed **.aab** for Google Play via approved Expo EAS Build or local Android build; APK/Expo Go is for device testing. Verify app ID/package name, versionCode, signing/upload key custody, supported devices and Android SDK compatibility; never commit credentials. Source: https://docs.expo.dev/submit/android/
- [ ] Test login/session, permissions, background/foreground, crash/analytics, deep links, notifications (if applicable), privacy, accessibility, offline failures, links to backend API versions and account deletion; link mobile QA CGN-257 and relevant acceptance tickets.
- [ ] Publish a valid privacy-policy URL; map personal-data collection/sharing for app AND third-party SDKs; prepare Data Safety declarations, permissions, user data account deletion, target audience/content rating, ads declaration and any reviewer test account/credentials with secure delivery. Sources: https://support.google.com/googleplay/android-developer/answer/10787469 and https://support.google.com/googleplay/android-developer/answer/9859455
- [ ] For affected personal developer accounts created after 2023-11-13, meet closed test requirements (**at least 12 testers opted in continuously 14 days**) before requesting production access; verify account-specific rules. Source: https://support.google.com/googleplay/android-developer/answer/14151465
- [ ] Collect store listing screenshots/icons, legal brand confirmation, support contacts, app privacy moderation/safety requirements, release notes, review/rollout/rollback plan, and approval evidence.
- [ ] Obtain explicit Sandeep sign-off and create a separately approved release execution ticket **before** registering/paying/uploading/submitting. No app publication is part of CGN-287 itself.

## Ownership

- Prachi: Android package/build, platform/UI feature parity, Play listing documentation and mobile evidence.
- Tanvi: CGN-257 device/functional/regression and privacy-related QA findings.
- Sandeep: final Android release, data/security/business API changes, privacy, cost and distribution approval.

The workflow can evolve as Google updates policy. Consult original sources when the actual release is scheduled, not a frozen 2026 checklist.
