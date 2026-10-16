import test from "node:test";
import assert from "node:assert/strict";
import {
  REPO,
  accepted,
  apiClient,
  desiredStatus,
  list,
  syncPR,
  ticketFromBranch,
  transition,
} from "../../scripts/ci/jira-delivery-sync.mjs";

const sha = "a".repeat(40);
const pr = {
  number: 37,
  state: "closed",
  merged: true,
  merged_at: "2026-10-16T12:00:00Z",
  merge_commit_sha: sha,
  merged_by: { login: "Sandeepagrahari78" },
  base: { ref: "main" },
  head: {
    ref: "CGN-299-agent-delivery",
    sha: "b".repeat(40),
    repo: { full_name: REPO },
  },
};
const comment = {
  user: { login: "Sandeepagrahari78" },
  created_at: "2026-10-16T12:01:00Z",
  body: `Reviewed technical changes and staging evidence.\nCGN-ACCEPTED: ${sha}`,
};
const evidence = { prCI: true, mainCI: true, accepted: true, handoff: true };

test("only canonical ticket branches are recognized", () => {
  assert.equal(ticketFromBranch("CGN-299-agent-delivery"), "CGN-299");
  for (const ref of [
    "main",
    "CGN-0-test",
    "CGN-299",
    "other/CGN-299-test",
    "CGN-299-x;bad",
  ]) {
    assert.equal(ticketFromBranch(ref), undefined);
  }
});

test("every completion gate is required; forks and unmerged closure never complete", () => {
  assert.equal(desiredStatus(pr, evidence), "Done");
  for (const gate of Object.keys(evidence)) {
    assert.equal(desiredStatus(pr, { ...evidence, [gate]: false }), null);
  }
  assert.equal(desiredStatus({ ...pr, merged: false }, evidence), null);
  assert.equal(
    desiredStatus({ ...pr, merged_by: { login: "someone-else" } }, evidence),
    null,
  );
  assert.equal(
    desiredStatus(
      { ...pr, head: { ...pr.head, repo: { full_name: "fork/repo" } } },
      evidence,
    ),
    null,
  );
  assert.equal(
    desiredStatus({ ...pr, base: { ref: "release" } }, evidence),
    null,
  );
  assert.equal(
    desiredStatus({ ...pr, state: "open", merged: false }),
    "In Review",
  );
  assert.equal(
    desiredStatus({ ...pr, state: "open", merged: false, draft: true }),
    "In Progress",
  );
});

test("acceptance is owner-authored, after merge and bound to exact merge SHA", () => {
  assert.equal(accepted(pr, [comment]), true);
  for (const change of [
    { user: { login: "coding-agent" } },
    { body: `CGN-ACCEPTED: ${"b".repeat(40)}` },
    { body: `> CGN-ACCEPTED: ${sha}` },
    { created_at: "2026-10-16T11:59:59Z" },
  ]) {
    assert.equal(accepted(pr, [{ ...comment, ...change }]), false);
  }
});

function fixture({
  status = "In Review",
  blocked = false,
  ci = "success",
  comments = [comment],
  files = [{ filename: "docs/handoffs/CGN-299.md", status: "modified" }],
} = {}) {
  const writes = [];
  const api = async (service, path, body) => {
    if (body) {
      writes.push({ service, path, body });
      return null;
    }
    if (path === "/pulls/37") {
      return pr;
    }
    if (path.includes("/comments?")) {
      return comments;
    }
    if (path.includes("/files?")) {
      return files;
    }
    if (path.includes("/actions/workflows/")) {
      const isPR = path.includes("pr-ci.yml");
      return {
        workflow_runs: [
          {
            id: 2,
            head_sha: isPR ? pr.head.sha : sha,
            event: isPR ? "pull_request" : "push",
            pull_requests: [{ number: 37 }],
            status: "completed",
            conclusion: ci,
          },
          {
            id: 1,
            head_sha: isPR ? pr.head.sha : sha,
            event: isPR ? "pull_request" : "push",
            pull_requests: [{ number: 37 }],
            status: "completed",
            conclusion: "success",
          },
        ],
      };
    }
    if (path.includes("/transitions")) {
      return { transitions: [{ id: "41", to: { name: "Done" } }] };
    }
    if (path.startsWith("/issue/CGN-1?")) {
      return { fields: { status: { statusCategory: { key: "new" } } } };
    }
    if (path.startsWith("/issue/CGN-299?")) {
      return {
        fields: {
          status: { name: status },
          subtasks: [],
          issuelinks: blocked
            ? [
                {
                  type: { inward: "is blocked by" },
                  inwardIssue: { key: "CGN-1" },
                },
              ]
            : [],
        },
      };
    }
    throw new Error(`Unexpected mock path ${path}`);
  };
  return { api, writes };
}

test("successful reconciliation posts exactly the discovered Jira transition", async () => {
  const { api, writes } = fixture();
  assert.match(await syncPR(api, 37), /Transitioned CGN-299 to Done/);
  assert.deepEqual(writes, [
    {
      service: "jira",
      path: "/issue/CGN-299/transitions",
      body: { transition: { id: "41" } },
    },
  ]);
});

test("failed latest CI, missing handoff, missing acceptance, blockers or Done make no write", async () => {
  for (const options of [
    { ci: "failure" },
    { files: [] },
    { comments: [] },
    { blocked: true },
    { status: "Done" },
  ]) {
    const { api, writes } = fixture(options);
    await syncPR(api, 37);
    assert.equal(writes.length, 0);
  }
});

test("late branch events cannot downgrade review or Done; unknown status fails closed", async () => {
  for (const status of ["In Review", "Done"]) {
    const { api, writes } = fixture({ status });
    await transition(api, "CGN-299", "In Progress");
    assert.equal(writes.length, 0);
  }
  await assert.rejects(
    transition(fixture({ status: "Custom" }).api, "CGN-299", "Done"),
    /Unmapped/,
  );
});

test("pagination reads beyond first page", async () => {
  const result = await list(
    async (_service, path) =>
      path.includes("page=2")
        ? [101]
        : Array.from({ length: 100 }, (_, i) => i),
    "/issues/37/comments",
  );
  assert.equal(result.length, 101);
});

test("credentials stay out of errors and redirect following is disabled", async () => {
  const env = {
    GITHUB_TOKEN: "test-gh",
    CGN_JIRA_EMAIL: "test@example.invalid",
    CGN_JIRA_API_TOKEN: "test-secret",
  };
  const api = apiClient(env, async (_url, options) => {
    assert.equal(options.redirect, "error");
    return {
      ok: false,
      status: 403,
      json: () => {
        throw new Error("must not read remote error body");
      },
    };
  });
  await assert.rejects(api("jira", "/issue/CGN-299"), {
    message: "jira HTTP 403; check permissions and rerun sync",
  });
  assert.throws(() => apiClient({}), /Missing repository secret/);
  await assert.rejects(
    api("jira", "https://other.example"),
    /Invalid API path/,
  );
  const failing = apiClient(env, async () => {
    throw new Error("test-secret");
  });
  await assert.rejects(failing("jira", "/issue/CGN-299"), {
    message: "jira request failed (network/timeout/redirect); rerun sync",
  });
});
