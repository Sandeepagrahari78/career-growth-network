# CGN-99: Zero-cost secrets workflow

## Local development

`infra/postgres/.env.example` contains placeholder values only. Copy it to
`infra/postgres/.env` for local PostgreSQL work and replace the password with a
local-only value. `.env` files are ignored by Git. Do not put credentials in a
committed example, command output, logs, screenshots or test fixtures.

The required PostgreSQL variable names and defaults are owned by
`config/infra/postgres-databases.v1.json`; `scripts/infra/postgres-local.mjs`
fails when the required password is missing. Add a new secret variable only in
the owning ticket's configuration contract and consuming runtime.

## GitHub Actions

Store CI credentials in the repository's encrypted **Settings → Secrets and
variables → Actions** store. Workflows read values through the GitHub Actions
`secrets` context and pass them only to the step that needs them. Never echo,
print, or enable shell tracing around secret-bearing commands. The repository's
Gitleaks scan runs in pull-request and main validation and blocks detected
secrets; do not add a broad allowlist to make a scan pass.

## Kubernetes

For a local or non-production cluster, create a Kubernetes `Secret` from a
local ignored environment file and apply the generated object directly to the
cluster. Do not save the rendered YAML in the repository or attach it to a PR.
The existing workload-identity policy disables service-account token
automount; application credentials must be mounted or injected only by the
owning workload configuration. This procedure does not approve a production
cluster or prove encryption-at-rest for a cluster.

## Rotation

1. Identify the owning service/configuration and each consumer of the value.
2. Generate a replacement value outside Git and update the relevant local
   environment, GitHub Actions secret, or non-production Kubernetes Secret.
3. Restart or rerun only the dependent workload, then verify its health and
   dependent checks without printing the value.
4. Revoke the prior value after the replacement works. If a value was exposed,
   remove it from active use and rotate it immediately; removing a file or
   rewriting Git history alone does not make the old value safe.

## Accidental-secret response

Stop the affected job or rollout, rotate/revoke the exposed credential at its
owner, remove the value from the working tree and artifacts, then rerun the
Gitleaks scan. Keep the finding and remediation metadata free of the secret
itself. Preserve the existing fail-closed Gitleaks configuration.

## Future managed storage

Local environment variables, GitHub encrypted secrets and Kubernetes Secrets
are the current zero-cost sources. A managed provider migration needs its own
reviewed ticket covering provider selection, identity, encryption, rotation,
cost, audit and rollback. Do not add a cloud provider or paid secret service in
this ticket.
