# Synchronous HTTP API versioning and errors

This policy applies to synchronous CGN business APIs. It defines a stable boundary; it does not create a route or authorize a new service.

## URL major versions

- Put the major contract version in the path: `/v1/<resource>`.
- Keep one major version segment. Do not put minor or patch versions in URLs.
- Health and readiness probes (`/health`, `/ready`) are operational endpoints and remain unversioned.
- A new service must use the major version approved by its owning contract. Existing services adopt this policy when their owning ticket authorizes the change; this document does not silently move existing routes.

## Compatible and breaking changes

Compatible changes keep the existing version and preserve all existing field meanings and behavior. Examples include adding an optional response field, adding an endpoint, or adding an optional request field with a safe default. Clients must tolerate unknown response fields and error codes. Adding an enum value is compatible only when consumers are specified and tested to tolerate unknown values; otherwise treat it as breaking.

Breaking changes include removing or renaming a field, changing its type or meaning, making an optional request field required, changing authorization or error semantics, or removing an endpoint. A breaking change requires a new major path (for example `/v2`) and an explicit migration/deprecation plan. Keep the old major available during the approved migration window; never silently change `/v1` behavior.

## Error response contract

Errors use `http.error-envelope.v1` from `@cgn/contracts`:

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "The requested resource was not found.",
    "requestId": "cgn-request-123"
  }
}
```

`code` is a stable machine-readable string and clients must handle unknown codes. `message` is safe for display and never contains raw exception text. `requestId` is optional for compatibility and, when present, matches the `x-request-id` response header. `details` remains optional and may contain only reviewed, non-sensitive, allow-listed context. Never return stack traces, secrets, tokens, submitted credential values, or internal provider/database messages.

The platform template maps HTTP 400 to `VALIDATION_ERROR`, 401 to `UNAUTHENTICATED`, 403 to `FORBIDDEN`, 404 to `NOT_FOUND`, unexpected 5xx failures to `UNEXPECTED_ERROR`, and other expected HTTP failures to `REQUEST_ERROR`. The original HTTP status is retained. Request correlation is assigned before exception handling so both the header and body can carry the same ID.
