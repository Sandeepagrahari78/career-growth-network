# CGN module navigation and status

Module ownership is defined by [bounded-contexts](../../packages/contracts/architecture/bounded-contexts.v1.json), not this convenience guide. Jira defines planned work; code on latest `main` defines what is implemented. Do not infer that a folder's presence means an API works.

| Module guide | Source folder | Status when CGN-285 started |
|---|---|---|
| [Identity](identity.md) | `services/identity/` | Workspace skeleton |
| [Career, Roadmap, Evidence and Growth](career-growth.md) | `services/career/`, `services/roadmap/`, `services/evidence/`, `services/growth/` | Workspace skeletons |
| [Social Feed / Network / Community / Messaging](social.md) | `services/feed/`, `services/network/`, `services/community/`, `services/messaging/` | Workspace skeletons |
| [Admin and Opportunities](admin-opportunities.md) | No approved implementation folder for opportunity/admin runtime | Planned Jira tickets, not deployed |
| [Gateway and clients](gateway-clients.md) | `services/gateway/`, `apps/web/`, `apps/mobile/` | Workspace skeletons |
| [Platform / CI](platform.md) | `infra/`, `scripts/ci/`, `.github/workflows/` | Infrastructure baseline and health-demo validated |

For every new feature ticket, update the affected module guide with **actual paths** from merged code and the real API/event references. Versioned cross-module contracts belong under `packages/contracts/`. Ticket-specific work stays in `docs/handoffs/CGN-NNN.md`.

[Project diagram](../architecture/PROJECT_FLOW.md) · [Agent workflow](../architecture/AGENT_WORKFLOW.md)
