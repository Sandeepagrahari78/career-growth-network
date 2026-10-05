import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("5k capacity contract", () => {
  const raw = readFileSync("config/performance/capacity.v1.json", "utf8");
  const c = JSON.parse(raw);
  const p = c.population;
  const t = c.traffic;
  const d = c.dependencyBudgets;

  assert.equal(c.contract, "cgn.capacity.v1");
  assert.equal(p.registeredBetaUsers, 5000);
  assert.ok(p.peakConcurrentSessions < p.registeredBetaUsers);
  assert.ok(t.steadyRequestsPerSecond < t.peakRequestsPerSecond);
  assert.ok(t.peakRequestsPerSecond < t.spikeRequestsPerSecond);
  assert.ok(c.availability.serverErrorRatePercentMax <= 1);
  assert.ok(d.databasePoolUtilizationPeakPercentMax < 100);
  assert.ok(d.cacheHitRatePercentMinAfterWarmup >= 70);

  for (const budget of Object.values(c.performanceClasses)) {
    assert.ok(budget.p50Ms <= budget.p95Ms);
    assert.ok(budget.p95Ms <= budget.p99Ms);
  }

  for (const profile of Object.values(c.loadProfiles)) {
    assert.equal(profile.syntheticUsers, 5000);
    assert.ok(profile.virtualUsers > 0);
    assert.ok(profile.targetRequestsPerSecond > 0);
    assert.ok(profile.durationMinutes > 0);
  }
});
