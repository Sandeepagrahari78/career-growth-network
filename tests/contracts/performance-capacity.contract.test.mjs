import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("CGN 5k capacity contract keeps non-functional requirements enforceable", async () => {
  const raw = await readFile(
    new URL("../../config/performance/capacity.v1.json", import.meta.url),
    "utf8",
  );
  const capacity = JSON.parse(raw);

  assert.equal(capacity.contract, "cgn.capacity.v1");
  assert.equal(capacity.population.registeredBetaUsers, 5000);

  assert.ok(
    capacity.population.peakConcurrentSessions <
      capacity.population.registeredBetaUsers,
    "5,000 registered users must not be modeled as 5,000 concurrent sessions",
  );

  assert.ok(
    capacity.traffic.steadyRequestsPerSecond <
      capacity.traffic.peakRequestsPerSecond,
  );
  assert.ok(
    capacity.traffic.peakRequestsPerSecond <
      capacity.traffic.spikeRequestsPerSecond,
  );

  for (const [name, budget] of Object.entries(capacity.performanceClasses)) {
    assert.ok(budget.p50Ms <= budget.p95Ms, `${name}: p50 must be <= p95`);
    assert.ok(budget.p95Ms <= budget.p99Ms, `${name}: p95 must be <= p99`);
  }

  assert.ok(capacity.availability.serverErrorRatePercentMax <= 1);
  assert.ok(
    capacity.dependencyBudgets.databasePoolUtilizationPeakPercentMax < 100,
  );
  assert.ok(
    capacity.dependencyBudgets.cacheHitRatePercentMinAfterWarmup >= 70,
  );

  for (const profile of Object.values(capacity.loadProfiles)) {
    assert.equal(profile.syntheticUsers, 5000);
    assert.ok(profile.virtualUsers > 0);
    assert.ok(profile.targetRequestsPerSecond > 0);
    assert.ok(profile.durationMinutes > 0);
  }

  assert.ok(
    capacity.architectureConstraints.some((item) =>
      item.includes("horizontally scalable"),
    ),
  );
  assert.ok(
    capacity.architectureConstraints.some((item) =>
      item.includes("Paid managed capacity"),
    ),
  );
});
