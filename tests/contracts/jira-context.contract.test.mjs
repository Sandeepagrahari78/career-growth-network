import test from "node:test";
import assert from "node:assert/strict";
import { fetchJiraContext, renderJiraIssue } from "../../scripts/jira-context.mjs";

const example = {
  key: "CGN-220",
  fields: {
    summary: "Build opportunity publishing workflow",
    status: { name: "To Do" },
    assignee: { displayName: "Tanvi" },
    description: {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Do not invent APIs." }],
        },
      ],
    },
    issuelinks: [
      {
        type: { inward: "is blocked by", outward: "blocks" },
        inwardIssue: { key: "CGN-204" },
      },
      {
        type: { inward: "is blocked by", outward: "blocks" },
        outwardIssue: { key: "CGN-242" },
      },
    ],
  },
};

test("live response preserves ownership, status and explicit link direction", () => {
  const report = renderJiraIssue(example, "CGN-220");
  assert.match(report, /Tanvi/);
  assert.match(report, /To Do/);
  assert.match(report, /is blocked by: CGN-204/);
  assert.match(report, /blocks: CGN-242/);
  assert.match(report, /Do not invent APIs/);
  assert.doesNotMatch(report, /CGN-219/);
});

test("optional fetch uses approved Jira HTTPS host and no credentials in output", async () => {
  let called = 0;
  const report = await fetchJiraContext("CGN-220", {
    email: "private@example.com",
    token: "test-secret-do-not-log",
    fetcher: async (url, options) => {
      called += 1;
      const host = "https://sandeepagrahari1.atlassian.net/rest/api/3/issue/";
      assert(url.startsWith(host + "CGN-220?"));
      assert.equal(options.method, "GET");
      assert.match(options.headers.Authorization, /^Basic /);
      return { ok: true, json: async () => example };
    },
  });
  assert.equal(called, 1);
  assert.match(report, /CGN-220/);
  assert.doesNotMatch(report, /test-secret-do-not-log/);
  assert.doesNotMatch(report, /private@example\.com/);
});

test("fails closed on absent credentials, invalid IDs, mismatched issues and 401", async () => {
  await assert.rejects(
    fetchJiraContext("CGN-220", {
      email: "",
      token: "",
      fetcher: async () => {},
    }),
    /requires/,
  );
  await assert.rejects(
    fetchJiraContext("CGN-220/../x", { email: "a", token: "b" }),
    /Invalid Jira/,
  );
  assert.throws(() => renderJiraIssue(example, "CGN-221"), /mismatch/);
  await assert.rejects(
    fetchJiraContext("CGN-220", {
      email: "a",
      token: "b",
      fetcher: async () => ({ ok: false, status: 401 }),
    }),
    /HTTP 401/,
  );
});
