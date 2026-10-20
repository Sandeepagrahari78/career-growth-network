# AI Orchestrator

`@cgn/ai` is the internal AI provider orchestration boundary owned by the AI
bounded context. The versioned `AiProviderV1` contract is implemented by an
injected provider; this package does not select a vendor or configure paid
credentials.

`AiOrchestrator` enforces a 10-second default timeout (configurable by its
owner), forwards cancellation through `AbortSignal`, maps provider exceptions
to stable safe error codes, and emits outcome/duration telemetry only. Prompts,
generated text and raw provider errors are never included in telemetry or
returned exception messages.

This package currently exposes an internal TypeScript boundary only. It does
not add an HTTP route, persistence, domain events, a database, or canonical
career/social/evidence state. Owning services remain responsible for business
truth and their own authorization and consent checks.

Run `pnpm --filter @cgn/ai test:unit` and
`pnpm --filter @cgn/ai test:integration` from the repository root.
