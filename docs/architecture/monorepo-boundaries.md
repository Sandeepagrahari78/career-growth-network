# CGN Monorepo Workspace Boundaries

Ticket: **CGN-33**

CGN uses a pnpm workspace with three explicit package roots:

- `apps/*` — user-facing application shells
- `services/*` — independently owned domain/runtime services
- `packages/*` — shared contracts and cross-cutting reusable packages

Every immediate directory under those roots is an explicit private `@cgn/*` workspace package.

## Dependency direction

The machine-readable source is `packages/contracts/architecture/workspace-boundaries.v1.json`.

Allowed workspace dependency direction:

```text
apps ---------> shared packages
services -----> shared packages
shared packages -> shared packages
```

Forbidden shortcuts:

```text
app ------X----> service implementation
service --X----> another service implementation
package --X----> app/service implementation
```

Cross-domain service collaboration uses versioned HTTP/events from `@cgn/contracts`, not direct service package imports and never direct cross-service database access.

## Why this matters

The rule keeps each service independently buildable/deployable and prevents the monorepo from turning into a distributed monolith with hidden source-of-truth coupling.

It also keeps a future multi-repository migration possible if team/scale needs ever justify it.

## Validation

Run:

```bash
pnpm ci:boundaries
```

The same check is part of `pnpm ci:quick` and therefore PR/Main CI.
