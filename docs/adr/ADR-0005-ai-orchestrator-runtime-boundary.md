# ADR-0005 - Internal AI Orchestrator Runtime Boundary

Status: Accepted

Ticket: CGN-122

## Context

The bounded-context map assigns AI provider orchestration to the AI context,
but the repository had no runtime path or provider contract. CGN-122 requires
a fake-provider implementation with timeout, cancellation and redaction
behavior while keeping AI internal and product truth in owning services.

## Decision

- The AI orchestration runtime lives in `services/ai/` and is owned by the AI
  bounded context.
- `packages/contracts/src/ai/ai-provider.v1.ts` defines the versioned internal
  provider request, result and provider interface.
- Providers are injected into the orchestrator. Vendor selection, credentials
  and paid infrastructure are outside this boundary and require their own
  reviewed work.
- The orchestrator enforces timeout and caller cancellation, returns stable
  safe error codes, and records only outcome and elapsed time. Prompts,
  generated text and raw provider exceptions are private and must not enter
  telemetry.
- AI does not own canonical career, evidence, identity, social or opportunity
  state. This ticket creates no route, database, event or cross-service call.

## Consequences

- Unit and integration tests can exercise the provider boundary with a fake
  implementation and no credentials.
- Downstream work can depend on a named AI runtime path and versioned interface.
- A real provider, request API, provider-specific data policy, retention or
  fallback policy still needs explicit owning-ticket scope and review.
