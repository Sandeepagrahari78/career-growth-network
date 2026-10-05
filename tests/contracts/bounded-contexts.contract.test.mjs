import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const map = JSON.parse(
  readFileSync(
    "packages/contracts/architecture/bounded-contexts.v1.json",
    "utf8",
  ),
);

const requiredContexts = [
  "gateway",
  "identity",
  "career",
  "roadmap",
  "evidence",
  "growth",
  "ai",
  "feed",
  "social-graph",
  "communities",
  "messaging",
  "cohorts",
  "experts",
  "opportunities",
  "recruiter",
  "notifications",
  "analytics",
  "admin",
];

test("bounded-context contract contains every frozen CGN context once", () => {
  assert.equal(map.contract, "cgn.bounded-contexts.v1");

  const ids = map.contexts.map((context) => context.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.deepEqual([...ids].sort(), [...requiredContexts].sort());

  for (const context of map.contexts) {
    assert.ok(context.owns.length > 0);
    assert.ok(context.mustNotOwn.length > 0);
  }
});

test("cross-domain boundaries are versioned and database shortcuts are forbidden", () => {
  assert.match(map.dataRule, /No service reads another service database/i);
  assert.equal(
    map.boundaries.synchronous.errorContract,
    "http.error-envelope.v1",
  );
  assert.equal(
    map.boundaries.asynchronous.envelopeContract,
    "domain.event.envelope.v1",
  );
  assert.equal(
    map.boundaries.asynchronous.canonicalCareerActivity.contract,
    "career.activity.v1",
  );
});

test("social ownership has one authoritative source per policy", () => {
  assert.equal(map.socialPrivacy.followConnectionBlockOwner, "social-graph");
  assert.equal(map.socialPrivacy.communityMembershipOwner, "communities");
  assert.equal(map.socialPrivacy.conversationStateOwner, "messaging");
  assert.equal(map.socialPrivacy.consentOwner, "identity");
});

test("canonical Career Activity reaches the required projections", () => {
  const consumers = new Set(
    map.boundaries.asynchronous.canonicalCareerActivity.consumers,
  );

  for (const consumer of ["growth", "feed", "notifications", "opportunities"]) {
    assert.equal(consumers.has(consumer), true);
  }
});

test("default Admin projection excludes sensitive private data classes", () => {
  const admin = map.contexts.find((context) => context.id === "admin");
  const forbidden = admin.mustNotOwn.join(" ").toLowerCase();

  for (const phrase of [
    "private message",
    "private evidence",
    "credentials",
    "ai conversation",
  ]) {
    assert.match(forbidden, new RegExp(phrase));
  }
});
