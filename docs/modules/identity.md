# Identity & Access

**Owning source path:** `services/identity/` (currently README/package workspace skeleton only).

**Responsible for:** accounts, roles, consent and authorization policy; does not own career scoring.

**Consumers:** Gateway, web/mobile authentication clients; social projections and recruiting must respect ownership/consent rules. These are contract intentions, not evidence of implemented endpoints.

**Read first:** `docs/engineering-memory/02-domain-ownership.md`, `packages/contracts/architecture/bounded-contexts.v1.json`, relevant Jira tickets and merged handoffs.

**Do not assume:** login API, migrations, tokens, session tables or production-grade auth have been shipped. Record real paths, migrations, tests and contract versions only when the ticket implementing them merges.

**Human review:** Sandeep on security, auth, consent and data decisions.
