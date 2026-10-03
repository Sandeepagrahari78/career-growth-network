# 07 - Agent Handoff Protocol

Every agent change must leave the next agent a deterministic handoff.

## Required handoff fields
- Jira ticket
- branch
- base branch
- files/modules changed
- behavior implemented
- contracts changed
- events produced/consumed
- DB migration/config/env changes
- tests run + results
- unresolved issues
- known risks
- exact next step
- rollback note
- engineering-memory files updated

## Rule
The next agent does not reconstruct intent from code alone. It reads:
1. AGENTS.md
2. generated agent context
3. active Jira ticket
4. relevant shared contracts
5. latest handoff
6. current-state memory
