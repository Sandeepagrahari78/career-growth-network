# ADR-0006 - Keycloak OIDC Identity Provider

Status: Accepted by the product/technical owner on 2026-10-20

Ticket: CGN-68

## Context

CGN-68 requires email/password and Google sign-in through an open-source OIDC
provider without mandatory paid infrastructure. CGN Identity owns internal
account IDs, roles, permissions and consent. Google must be an external broker,
not CGN's primary identity authority. CGN-67 and CGN-99 provide the merged
Identity account repository and zero-cost secret strategy.

## Decision

- Use self-hosted Keycloak as the official OIDC provider. Pin the local
  development image to `quay.io/keycloak/keycloak:26.8.1` on the existing
  zero-cost local Docker infrastructure. Do not provision paid cloud services
  or deploy production infrastructure through CGN-68.
- Keycloak handles local email/password registration and brokers Google as an
  optional upstream identity provider. Google credentials are configured only
  through local environment/approved secret configuration; no live Google
  credentials are present in source. The login method and broker hint remain
  environment-configurable.
- Use OIDC Authorization Code Flow with PKCE S256, exact redirect URI matching,
  state/nonce/browser-binding validation, issuer/audience/expiration checks,
  JOSE signature verification and provider JWKS rotation through
  `openid-client` 6.8.8. Production URLs require HTTPS and confidential-client
  authentication. HTTP is allowed only for loopback local development/test.
- Keep configuration provider-neutral: issuer, client ID, authentication mode,
  callback, logout callback and the Google broker hint parameter are
  configuration. A future issuer can be selected without adding another
  identity store; provider-specific broker selection is isolated to the
  configured parameter and alias.
- Identity continues to own the CGN account ID, account-to-provider-subject
  mapping, session API and any future authorization context. Persist only the
  exact `(issuer, subject)` mapping; do not auto-link accounts by email. Existing
  Keycloak users must complete Keycloak's first-broker reauthentication/link
  flow. Identity never consumes Google tokens as its business identity.
- Hash one-use state, browser binding and session cookie identifiers before
  database storage. Encrypt PKCE verifier, nonce, ID token and refresh token
  with AES-256-GCM under the environment/secret-configured Identity key. Return
  only the Identity account ID and session timestamps to clients.
- The local realm is development-only, loopback-bound, uses exact callback
  allow-lists, enables standard code flow with PKCE and disables implicit and
  direct-grant flows. No production realm or deployment is created.

## Consequences

- Local development can exercise email/password through the pinned Keycloak
  realm without a paid provider. Google sign-in is activated only when real
  OAuth credentials are supplied to the local secret configuration; controlled
  provider tests do not assert real Google login success.
- One-time login transactions and sessions use Identity-owned database tables,
  avoiding process-local state and preserving horizontal scaling.
- Applications receive a stable versioned Identity session contract without
  receiving OIDC access, refresh or ID tokens.
- Production Keycloak hosting, TLS/hostname configuration, secret injection,
  backups, monitoring and Google credential verification remain unproven and
  require their own deployment and operations approvals.
