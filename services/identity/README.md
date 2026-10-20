# Identity Service

Identity owns the internal account identifier, external provider-subject
mapping, authentication sessions, and application roles. Provider credentials
remain with the authentication provider. Career goals, education stage, career
profile, and scoring remain with their respective domains.

## Persistence

The `cgn_identity` database contains the Identity-owned `identity` schema.
Migration `001_identity_accounts.up.sql` creates UUID accounts and unique
`(issuer, subject)` provider mappings. Migration `002_identity_auth_sessions.up.sql`
adds hashed one-time login state and session identifiers, encrypted OIDC
transaction/session tokens, and Identity-owned expiry indexes. Migration
`003_identity_account_roles.up.sql` creates the allow-listed Identity role
assignments and role-change audit table. All repositories use the injected
Identity database adapter with parameterized queries; no other service database
is accessed. `createIdentityAuthRuntime()` composes the repositories, OIDC
service and HTTP server. The host process supplies the database driver,
connection settings and adapter.

Run repository unit tests with `pnpm --filter @cgn/identity test:unit`. The
PostgreSQL acceptance test runs only against the disposable local/CI database
started by `scripts/infra/postgres-local.mjs` and proves migration rollback and
ownership constraints.

## Authentication

Identity uses the provider-neutral `cgn.identity.oidc-provider-config.v1`
contract and OpenID Connect Authorization Code Flow with PKCE S256. The client
validates state, nonce, issuer, audience, expiry and the provider's JWKS
signature. Login transactions are one-use and browser-bound. Exact
`(issuer, subject)` mappings select Identity accounts; matching email addresses
never merge accounts. Keycloak's default first-broker login flow requires an
existing-account verification/link step. Session IDs and login state are stored
as SHA-256 digests; PKCE verifier, nonce, refresh token and ID token are
authenticated AES-256-GCM ciphertext in the Identity database. Public session
responses contain only the internal account ID and session timestamps.

HTTP routes are `/v1/identity/auth/authorize`, `/callback`, `/session`,
`/authorization-context`, `/refresh` and `/logout`. Session and browser-binding cookies are HttpOnly,
SameSite=Lax and Secure in production. Production configuration requires HTTPS
and a confidential OIDC client. Local loopback HTTP is accepted only outside
production.

## Application roles

Identity persists only the recognized application roles `student`, `expert`,
`recruiter` and `admin`, with `active` or `inactive` status. A new account gets
no implicit role. OIDC provider role claims and client-supplied role values are
ignored. The authenticated `/v1/identity/auth/authorization-context` route
resolves the account from the HttpOnly Identity session and returns only
recognized active roles; status is re-read on each request. Unknown and
inactive roles fail closed. Role changes are Identity-owned and written to the
role-change audit table.

This context is an Identity response for server-side authorization checks; a
client must not submit or forward it as authorization proof. The `recruiter`
application role does not imply an approved organization membership (CGN-102),
the `expert` role does not imply verified expertise (CGN-186), and the `admin`
role does not define delegated Admin/Operator visibility or action permissions
(CGN-279). This ticket adds no role-grant HTTP route or service-to-service
authentication; those grants remain limited to trusted Identity-side
workflows. No resource-specific permission matrix is established here.

## Local Keycloak 26.8.1

The committed local realm import is development-only: it enables email/password
registration, disallows duplicate emails, creates a public OIDC client with
PKCE S256 and an exact callback URI, and disables direct-grant and implicit
flows. It binds only to `127.0.0.1:18080`. It is not a production deployment
configuration. Importing the realm does not configure Google credentials or
claim that live Google sign-in works.

In PowerShell, set unique local administrator credentials in the environment,
then start the existing local Docker Engine:

```powershell
$env:CGN_KEYCLOAK_ADMIN_USERNAME = "cgn-local-admin"
$env:CGN_KEYCLOAK_ADMIN_PASSWORD = Read-Host "Local Keycloak admin password"
docker compose -f services/identity/keycloak/docker-compose.yml up -d
```

Configure the application process from local environment or the approved secret
store. Do not commit a `.env` file or credential values:

```text
NODE_ENV=development
CGN_IDENTITY_OIDC_ISSUER=http://127.0.0.1:18080/realms/cgn-local
CGN_IDENTITY_OIDC_CLIENT_ID=cgn-identity
CGN_IDENTITY_OIDC_CLIENT_AUTHENTICATION=none
CGN_IDENTITY_OIDC_REDIRECT_URI=http://127.0.0.1:3000/v1/identity/auth/callback
CGN_IDENTITY_OIDC_POST_LOGOUT_REDIRECT_URI=http://127.0.0.1:3000/
CGN_IDENTITY_SESSION_ENCRYPTION_KEY=<base64 for a fresh random 32-byte key>
CGN_IDENTITY_GOOGLE_BROKER_ALIAS=google
CGN_IDENTITY_GOOGLE_BROKER_HINT_PARAMETER=kc_idp_hint
```

To enable Google locally, register a Google OAuth web client and set
`CGN_GOOGLE_OAUTH_CLIENT_ID` and `CGN_GOOGLE_OAUTH_CLIENT_SECRET` only in the
local secret environment, along with the Keycloak admin values above. Add the
exact callback `http://127.0.0.1:18080/realms/cgn-local/broker/google/endpoint`
to the Google OAuth client. Then run
`node services/identity/keycloak/configure-google-broker.mjs`. The script
updates the local Keycloak realm through its admin API, never writes credentials
to the repository, sets the Google email as untrusted, and retains Keycloak's
reauthentication/link flow for existing accounts. Keycloak persists its realm
configuration in its local Docker volume; protect that local volume and remove
it with `docker compose -f services/identity/keycloak/docker-compose.yml down -v`
when no longer needed. This removes the disposable local realm and its users.

Without real Google credentials, validate the broker route using controlled
OIDC tests only. Those tests do not claim that a real Google login succeeded.
The controlled provider covers successful code/PKCE exchange, state and browser
binding, issuer/audience/expiry/signature/nonce failures, JWKS rediscovery,
email collision without auto-linking, refresh rotation, expiry, logout and
provider outages.
