# Admin / Opportunities — Planned boundaries

**Important:** There is no verified `services/admin/` or `services/opportunities/` implementation directory on main at CGN-285 creation. No endpoints/schema or publication workflows are claimed here.

**CGN-220** (Tanvi, Jira To Do when checked): "Build opportunity management and publish workflow". It is scoped to the Admin/Opportunity experience; backend access/data changes need Sandeep review. Related Jira tickets determine the actual source-ownership boundary.

**CGN-203** (Tanvi, Jira To Do when checked): expert authorization audit and validation replay tests. This is an Expert Validation feature ticket, **not** the project's master architecture ticket.

**Process for Tanvi:** open current Jira and links → inspect relevant merged contracts/handoffs → generate context pack → propose exact new/existing paths → resolve any missing service contract with Sandeep → implement only approved scope → add tests and handoff. Never assume sequential Jira ticket IDs are dependency edges.

**Safety:** Admin consumes privacy-safe projections; no default private message bodies, evidence files, credentials, AI history or raw cross-service DB reads.

[Agent onboarding](../architecture/AGENT_WORKFLOW.md) · [Domain ownership](../engineering-memory/02-domain-ownership.md)
