import test from "node:test";
import assert from "node:assert/strict";
import {
  buildSchedule,
  parseExecutionSequence,
} from "../../scripts/coordination/dependency-aware-scheduler.mjs";

const owners = {
  s: "Sandeep Agrahari",
  p: "Prachi Akhilesh Dubey",
  t: "Tanvi Ambre",
};

function issue(
  key,
  owner,
  sequence,
  {
    status = "To Do",
    deps = [],
    type = "Task",
    rank = `0|i${String(sequence).padStart(5, "0")}:`,
    duplicate = false,
  } = {},
) {
  return {
    key,
    fields: {
      summary: `Work ${key}`,
      status: {
        name: status,
        statusCategory: { key: status === "Done" ? "done" : "new" },
      },
      assignee: owner ? { displayName: owner } : null,
      issuetype: { name: type },
      resolution: duplicate ? { name: "Duplicate" } : null,
      customFields: { Rank: { value: rank } },
      description: `Execution sequence: ${String(sequence).padStart(3, "0")} of 224`,
      issuelinks: deps.map((key) => ({
        type: { name: "Blocks", inward: "is blocked by", outward: "blocks" },
        inwardIssue: { key },
      })),
    },
  };
}

function complete(issues, completionEvidence = {}) {
  return {
    issues,
    total: issues.length,
    complete: true,
    fetchedAt: "2026-10-18T00:00:00.000Z",
    completionEvidence,
  };
}

const proof = {
  verified: true,
  "merged PR": true,
  handoff: true,
  "PR CI": true,
  "Main CI": true,
  staging: true,
};

test("parses execution sequence from Jira description without treating issue key as order", () => {
  assert.deepEqual(parseExecutionSequence("Execution sequence: 007 of 224"), {
    current: 7,
    total: 224,
  });
  assert.equal(parseExecutionSequence("No execution order"), null);
});

test("accepts Jira LexoRank values with optional suffix", () => {
  const result = buildSchedule(
    complete([
      issue("CGN-1", owners.s, 1, { rank: "0|i0008e:zv" }),
      issue("CGN-2", owners.p, 2, { rank: "0|i0007j:" }),
    ]),
  );
  assert.equal(result.lanes[owners.s].blocked.length, 0);
  assert.equal(result.lanes[owners.s].nextReady.key, "CGN-1");
  assert.equal(result.lanes[owners.p].nextReady.key, "CGN-2");
});

test("cross-owner transitive dependency lookahead preserves both current tickets", () => {
  const issues = [
    issue("CGN-10", owners.s, 1, { status: "In Progress" }),
    issue("CGN-11", owners.s, 2, { deps: ["CGN-30"] }),
    issue("CGN-12", owners.s, 3),
    issue("CGN-20", owners.t, 4, { status: "In Progress" }),
    issue("CGN-30", owners.t, 50, { deps: ["CGN-31"] }),
    issue("CGN-31", owners.t, 51),
    issue("CGN-13", owners.p, 5, { deps: ["CGN-30"] }),
  ];
  const result = buildSchedule(complete(issues), {
    now: "2026-10-18T00:00:00.000Z",
  });
  const sandeep = result.lanes[owners.s];
  const tanvi = result.lanes[owners.t];
  assert.equal(sandeep.current[0].key, "CGN-10");
  assert.equal(sandeep.nextReady.key, "CGN-12");
  assert.equal(tanvi.current[0].key, "CGN-20");
  assert.equal(tanvi.nextReady.key, "CGN-31");
  assert.equal(tanvi.nextReady.suggestedPriority, "UPSTREAM_ENABLER");
  assert.equal(tanvi.nextReady.crossTeamTicketsUnlocked, 2);
  assert.deepEqual(
    sandeep.blocked[0].dependencyChain.map((item) => item.key),
    ["CGN-30", "CGN-31"],
  );
  assert.match(sandeep.blocked[0].rationale, /CGN-30:.*not Done/);
  assert.match(sandeep.blocked[0].rationale, /CGN-31:.*not Done/);
});

test("allows independent owners to progress in parallel and uses stable sequence tie breaks", () => {
  const issues = [
    issue("CGN-8", owners.s, 8),
    issue("CGN-2", owners.s, 2),
    issue("CGN-9", owners.p, 9),
    issue("CGN-4", owners.t, 4),
  ];
  const first = buildSchedule(complete(issues));
  const second = buildSchedule(complete([...issues].reverse()));
  assert.equal(first.lanes[owners.s].nextReady.key, "CGN-2");
  assert.equal(first.lanes[owners.p].nextReady.key, "CGN-9");
  assert.equal(first.lanes[owners.t].nextReady.key, "CGN-4");
  assert.deepEqual(
    Object.fromEntries(
      Object.entries(first.lanes).map(([key, lane]) => [
        key,
        lane.recommendation,
      ]),
    ),
    Object.fromEntries(
      Object.entries(second.lanes).map(([key, lane]) => [
        key,
        lane.recommendation,
      ]),
    ),
  );
});

test("keeps a cycle fail-closed and identifies dependency cycles", () => {
  const result = buildSchedule(
    complete([
      issue("CGN-1", owners.s, 1, { deps: ["CGN-2"] }),
      issue("CGN-2", owners.p, 2, { deps: ["CGN-1"] }),
    ]),
  );
  assert.equal(result.diagnostics.cycleDetected, true);
  assert.equal(result.lanes[owners.s].blocked[0].key, "CGN-1");
  assert.match(result.lanes[owners.s].blocked[0].rationale, /cycle/i);
});

test("missing dependency targets and missing Jira owners are explicit blockers/diagnostics", () => {
  const issues = [
    issue("CGN-1", owners.s, 1, { deps: ["CGN-999"] }),
    issue("CGN-2", null, 2),
  ];
  const result = buildSchedule(complete(issues));
  assert.match(
    result.lanes[owners.s].blocked[0].rationale,
    /Missing Jira predecessor CGN-999/,
  );
  assert.deepEqual(result.diagnostics.unassignedActionable, ["CGN-2"]);
});

test("description hard prerequisites that conflict with Jira Blocks links fail closed", () => {
  const mismatch = issue("CGN-1", owners.s, 1);
  mismatch.fields.description += "\nHard prerequisites: CGN-2";
  const result = buildSchedule(
    complete([mismatch, issue("CGN-2", owners.p, 2)]),
  );
  assert.equal(result.lanes[owners.s].blocked[0].key, "CGN-1");
  assert.match(
    result.lanes[owners.s].blocked[0].rationale,
    /conflicting prerequisites/,
  );
  assert.match(result.diagnostics.prerequisiteConflicts[0].reason, /CGN-2/);
});

test("Done predecessor without merged handoff and CI evidence is blocked", () => {
  const result = buildSchedule(
    complete([
      issue("CGN-1", owners.p, 1, { status: "Done" }),
      issue("CGN-2", owners.s, 2, { deps: ["CGN-1"] }),
    ]),
  );
  assert.match(
    result.lanes[owners.s].blocked[0].rationale,
    /Jira is Done, but GitHub completion evidence is unverified/,
  );
  assert.match(result.lanes[owners.s].blocked[0].rationale, /Main CI/);
});

test("verified Done predecessor releases downstream work and review state stays separate", () => {
  const issues = [
    issue("CGN-1", owners.p, 1, { status: "Done" }),
    issue("CGN-2", owners.s, 2, { deps: ["CGN-1"] }),
    issue("CGN-3", owners.t, 3, { status: "In Review" }),
  ];
  const result = buildSchedule(complete(issues, { "CGN-1": proof }));
  assert.equal(result.lanes[owners.s].nextReady.key, "CGN-2");
  assert.equal(result.lanes[owners.t].waitingForReview[0].key, "CGN-3");
});

test("malformed rank, duplicate, and partial Jira results fail closed or are excluded", () => {
  const malformed = issue("CGN-1", owners.s, 1, { rank: "not-a-rank" });
  const duplicate = issue("CGN-2", owners.s, 2, { duplicate: true });
  const result = buildSchedule({
    issues: [malformed, duplicate],
    total: 3,
    complete: false,
  });
  assert.match(result.lanes[owners.s].blocked[0].rationale, /partial/);
  assert.match(
    result.lanes[owners.s].blocked[0].rationale,
    /Rank is missing or malformed/,
  );
  assert.deepEqual(result.diagnostics.excludedDuplicates, ["CGN-2"]);
});

test("zero-ready lane reports waiting and every owner's recommendations are explicit", () => {
  const result = buildSchedule(
    complete([
      issue("CGN-1", owners.s, 1, { status: "In Progress" }),
      issue("CGN-2", owners.s, 2, { deps: ["CGN-3"] }),
      issue("CGN-3", owners.p, 3),
    ]),
  );
  assert.equal(result.lanes[owners.s].recommendation, null);
  assert.equal(result.lanes[owners.s].waiting[0].decision, "WAITING");
  assert.equal(result.lanes[owners.p].recommendation, "CGN-3");
  assert.equal(result.lanes[owners.t].recommendation, null);
});

test("blocks linked to completed predecessors require evidence; unlinked work remains independent", () => {
  const issues = [
    issue("CGN-1", owners.p, 1, { status: "Done" }),
    issue("CGN-2", owners.s, 2, { deps: ["CGN-1"] }),
    issue("CGN-3", owners.t, 3),
  ];
  const result = buildSchedule(complete(issues));
  assert.equal(result.lanes[owners.t].nextReady.key, "CGN-3");
  assert.equal(result.lanes[owners.s].blocked[0].key, "CGN-2");
});

test("offline normalized links retain blocked-by direction", () => {
  const snapshot = complete([
    {
      key: "CGN-1",
      summary: "Upstream",
      status: "To Do",
      owner: owners.t,
      rank: "0|i00001:",
      executionSequence: { current: 1, total: 224 },
      type: "Task",
    },
    {
      key: "CGN-2",
      summary: "Downstream",
      status: "To Do",
      owner: owners.s,
      rank: "0|i00002:",
      executionSequence: { current: 2, total: 224 },
      type: "Task",
      links: [{ relation: "blockedBy", key: "CGN-1" }],
    },
  ]);
  const result = buildSchedule(snapshot);
  assert.equal(result.lanes[owners.s].blocked[0].key, "CGN-2");
  assert.equal(result.lanes[owners.t].nextReady.key, "CGN-1");
});

test("machine-readable index includes all Jira items and their ownership, Rank, links, and decision", () => {
  const issues = [
    issue("CGN-1", owners.s, 1, { status: "Done" }),
    issue("CGN-2", owners.p, 2, { deps: ["CGN-1"] }),
    issue("CGN-3", owners.t, 3, { status: "In Progress" }),
  ];
  const result = buildSchedule(complete(issues, { "CGN-1": proof }));
  assert.equal(result.issueIndex.length, 3);
  const downstream = result.issueIndex.find((ticket) => ticket.key === "CGN-2");
  assert.equal(downstream.assignedOwner, owners.p);
  assert.equal(downstream.rank, "0|i00002:");
  assert.deepEqual(downstream.directAndTransitiveUpstream, ["CGN-1"]);
  assert.equal(downstream.decision, "NEXT_READY");
});
