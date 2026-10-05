# ADR-0001 - Shared Engineering Memory and Agent Synchronization

Status: Accepted

## Context
CGN will be built by multiple humans and coding agents. Context loss between agents can cause duplicate models, conflicting contracts, feature drift and unsafe assumptions.

## Decision
Maintain a repository-native Engineering Memory plus machine-readable project manifest, shared contract registry, explicit handoff notes and an agent-context generation command.

## Consequences
Positive: less agent drift, reproducible handoff, easier review, clearer ownership.
Trade-off: memory must be updated continuously or it becomes misleading.
