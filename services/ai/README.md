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

`resolveAiPrompt` takes caller-supplied version definitions and selects only
the requested prompt ID and version; it never falls back to another version.
Each definition carries its template, declared variables, model configuration,
response schema and source/revision provenance as one versioned unit. The
resolver validates configuration and requires an exact set of string
variables. It returns the rendered prompt and safe version metadata for the
injected provider. Prompt text and variable values are private and are not
included in orchestration telemetry or resolution errors. The resolver is
stateless: configuration ownership and storage remain outside this package.

Run `pnpm --filter @cgn/ai test:unit` and
`pnpm --filter @cgn/ai test:integration` from the repository root.
