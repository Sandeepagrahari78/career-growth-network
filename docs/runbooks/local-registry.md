# CGN Local Docker Registry Runbook

Ticket: **CGN-65**

CGN uses a local registry as the zero-cost fallback when GitHub Container Registry publishing is not explicitly enabled.

## Start the registry

```bash
docker compose -f infra/docker/docker-compose.registry.yml up -d
```

Registry endpoint:

```text
localhost:5000
```

## Build and push a service locally

Example with `health-demo`:

```bash
docker build -f services/health-demo/Dockerfile -t localhost:5000/cgn-health-demo:dev .
docker push localhost:5000/cgn-health-demo:dev
```

## Pull the same image

```bash
docker pull localhost:5000/cgn-health-demo:dev
```

## Stop the registry

```bash
docker compose -f infra/docker/docker-compose.registry.yml down
```

Add `-v` only when you intentionally want to delete locally stored registry images.

## GitHub Container Registry switch

The GitHub workflow always builds changed Docker services. It publishes to GHCR only when the repository variable below is explicitly set:

```text
CGN_ENABLE_GHCR=true
```

The workflow uses GitHub's short-lived `GITHUB_TOKEN`; no registry password is stored in the repository.

If GHCR is disabled, the main-branch workflow still proves that each changed image builds successfully but does not publish it.

## Image identity

Published images use immutable commit-SHA tags:

```text
ghcr.io/<owner>/cgn-<service>:sha-<full-git-sha>
```

A moving `main` tag may also be published for convenience, but deployment promotion must use the immutable SHA tag.

## Cost rule

Do not enable a paid registry or paid cloud container service without explicit Sandeep approval.
