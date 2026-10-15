# Social projection / Network / Community / Messaging

**Paths:** `services/feed/`, `services/network/`, `services/community/`, `services/messaging/`. These folders currently contain package skeletons, not full social features.

**Sources of truth:** Network (social graph) controls follows, connections and blocks; Identity owns consent; Community owns membership/discussion state; Messaging owns message bodies/state; Feed owns ranking/projections, not original career or consent truth.

**Privacy rule:** denied, blocked, deleted or unconsented source data must not remain publicly visible in derived projections; consumers cannot bypass owning checks by querying another service's database.

**Cross-service coordination:** no shared direct DB reads; use authorized versioned API/event contracts. Detailed integrations follow the owning Jira tickets.

**Agent check:** a Feed/Messaging change modifying block semantics requires owning-contract and Sandeep review even when the ticket is frontend-oriented.
