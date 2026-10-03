# 06 - Known Risks

- Agent drift: agents may infer features that were never approved. Mitigation: Jira + context bundle + stop-on-conflict rule.
- Contract drift: producer and consumer may evolve independently. Mitigation: shared contracts + contract tests.
- Memory drift: docs can become stale. Mitigation: memory check in PR/CI and required handoff update.
- Privacy drift: social/admin features may expose more than intended. Mitigation: server-side consent/block/RBAC and explicit safe projections.
- Scale assumptions: 5,000 registered users is not the same as 5,000 concurrent users. Mitigation: separate load profiles and SLOs.
- Premature infrastructure complexity: pipeline/infra can become the project. Mitigation: phase gates and local-first tools.
