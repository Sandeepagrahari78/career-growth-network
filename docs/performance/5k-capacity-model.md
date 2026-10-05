# CGN 5,000-User Capacity Model & SLO Contract

Ticket: **CGN-283**  
Contract: **cgn.capacity.v1**

This document converts “CGN must support the first 5,000 beta users” into measurable engineering targets. It is a pre-production capacity contract, not a commercial SLA and not a claim that 5,000 users are simultaneously active.

The machine-readable source for automation is:

`config/performance/capacity.v1.json`

## 1. Population model

The initial beta population target is **5,000 registered users**.

For engineering tests, use the following assumptions:

- 1,250 daily active users
- 3,000 weekly active users
- 250 peak concurrent authenticated sessions
- 500 concurrent sessions for stress/spike validation

These are test parameters only. Product analytics must replace them later when real usage data exists.

## 2. Traffic model

Initial gateway traffic targets:

- steady: 25 requests/second
- peak: 75 requests/second
- spike: 150 requests/second
- write traffic assumption: 25%

The load generator must use the 5,000-user synthetic dataset while varying concurrency and request rate independently.

## 3. Performance classes

Rather than inventing endpoint-specific numbers before all APIs exist, every P0 API/journey must inherit one of these performance classes.

### Interactive

Use for short request/response interactions such as authentication, Today's Mission and lightweight community/message metadata.

- p50 <= 150 ms
- p95 <= 400 ms
- p99 <= 800 ms

### Aggregated

Use for multi-source or projection-backed reads such as Social Home, Growth Identity, Opportunities and Admin summaries.

- p50 <= 300 ms
- p95 <= 800 ms
- p99 <= 1,500 ms

### Async command

Use for operations that validate and enqueue work rather than perform expensive work synchronously, including proof-upload initialization.

- p50 <= 200 ms
- p95 <= 600 ms
- p99 <= 1,200 ms

Actual large-file transfer time is not part of the API latency budget. Large payloads should use signed object-storage URLs when implemented.

## 4. Reliability budgets

For beta validation:

- monthly availability engineering target: 99.5%
- server-side error rate: <= 0.5% during normal/peak profiles
- server-side error rate: <= 1.0% during spike profile
- timeout rate: <= 0.25%

A performance run fails if its configured profile crosses the machine-readable threshold.

## 5. Dependency budgets

### Database

- connection-pool utilization <= 70% steady
- connection-pool utilization <= 85% peak
- representative query p95 <= 100 ms
- scale/rework trigger when storage or IOPS headroom falls below 30%

### Cache

After warm-up:

- cache hit rate >= 80%
- memory headroom >= 25%

### Events and workers

- event lag p95 <= 5 seconds
- event lag p99 <= 15 seconds
- oldest worker job age <= 15 seconds

### Object storage

Signed-URL issuance p95 <= 500 ms. Binary upload/download throughput is measured separately from API latency.

## 6. Load profiles

All profiles run against deterministic synthetic data representing 5,000 registered users.

| Profile | Virtual users | Target RPS | Duration |
| --- | ---: | ---: | ---: |
| Smoke | 10 | 10 | 2 min |
| Baseline | 100 | 25 | 10 min |
| Peak | 250 | 75 | 15 min |
| Spike | 500 | 150 | 5 min |
| Soak | 200 | 50 | 60 min |

CGN-284 owns the deterministic seed generator and full k6 implementation. CGN-233 and CGN-258 consume these thresholds for gateway and RC hardening.

## 7. Horizontal-scale constraints

The 5K target must not require an architectural rewrite. Therefore:

- production service correctness must not depend on sticky in-process session state
- services must remain horizontally scalable behind a gateway/load balancer
- domain data ownership stays isolated; no cross-service database shortcuts
- expensive/background work must be queueable where appropriate
- large files should bypass app servers using signed object-storage access
- request handlers must not depend on one local filesystem or one process-local cache for correctness

## 8. Scale triggers

Scale or tune when two consecutive five-minute windows exceed a threshold.

Gateway/application:

- CPU > 70%
- memory > 75%
- p95 above the assigned performance class

Database:

- pool > 85% during peak
- query p95 > 100 ms
- storage/IOPS headroom < 30%

Cache:

- hit rate < 80% after warm-up
- memory headroom < 25%

Events/workers:

- event lag p99 > 15 seconds
- oldest queued job > 15 seconds

## 9. Cost rule

All current testing and validation remains **₹0-first**.

A threshold may prove that more capacity is required, but no paid managed database, Kubernetes service, registry, observability platform or cloud resource may be enabled without explicit Sandeep approval.

## 10. Pass/fail interpretation

“Supports 5,000 users” means:

1. the system can hold and operate on a deterministic 5,000-user beta dataset;
2. the approved concurrency/RPS profiles meet latency, reliability and dependency budgets;
3. no known single-node correctness assumption blocks horizontal scale;
4. failure/soak/spike tests can identify bottlenecks before release;
5. scale triggers and rollback paths are documented.

It does **not** mean 5,000 users are assumed to generate simultaneous requests.

## 11. Future calibration

These v1 values are initial engineering targets. After real beta telemetry exists, a dedicated Jira change may tighten or relax thresholds using evidence. Agents must not silently weaken thresholds to make CI green.
