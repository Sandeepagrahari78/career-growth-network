import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("5k capacity contract invariants", async () => {
  const url = new URL(
    "../../config/performance/capacity.v1.json",
    import.meta.url,
  );
  const raw = await readFile(url, "utf8");
  const capacity = JSON.parse(raw);

  const population = capacity.population;
  const traffic = capacity.traffic;
  const dependencies = capacity.dependencyBudgets;

  assert.equal(capacity.contract, "cgn.capacity.v1");
  assert.equal(population.registeredBetaUsers, 5000);
  assert.ok(
    population.peakConcurrentSessions < population.registeredBetaUsers,
  );

  assert.ok(
    traffic.steadyRequestsPerSecond < traffic.peakRequestsPerSecond,
  );
  assert.ok(
    traffic.peakRequestsPerSecond < traffic.spikeRequestsPerSecond,
  );

  for (const budget of Object.values(capacity.performanceClasses)) {
    assert.ok(budget.p50Ms <= budget.p95Ms);
    assert.ok(budget.p95Ms <= budget.p99Ms);
  }

  assert.ok(capacity.availability.serverErrorRatePercentMax <= 1);
  assert.ok(dependencies.databasePoolUtilizationPeakPercentMax < 100);
  assert.ok(dependencies.cacheHitRatePercentMinAfterWarmup >= 70);

  for (const profile of Object.values(capacity.loadProfiles)) {
    assert.equal(profile.syntheticUsers, 5000);
    assert.ok(profile.virtualUsers > 0);
    assert.ok(profile.targetRequestsPerSecond > 0);
    assert.ok(profile.durationMinutes > 0);
  }

  const constraints = capacity.architectureConstraints;
  assert.ok(
    constraints.some((item) => item.includes("horizontally scalable")),
  );
  assert.ok(
    constraints.some((item) => item.includes("Paid managed capacity")),
  );
});
