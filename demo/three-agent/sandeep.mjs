import { readFileSync, writeFileSync } from "node:fs";
import assert from "node:assert/strict";

const policy = readFileSync("AGENTS.md", "utf8");
const state = readFileSync(".cgn/context-CGN-285-three-agent.md", "utf8");
assert.match(policy, /No direct cross-service database access/);
assert.match(state, /Ticket: CGN-285/);
assert.match(state, /Latest main fetched/);

writeFileSync(
  ".cgn/demo/three-agent/sandeep-policy.json",
  JSON.stringify(
    {
      role: "Sandeep — architecture review simulation",
      ticket: "CGN-285",
      source: "AGENTS.md + CGN-285 context",
      constraints: [
        "Jira controls ticket scope",
        "Main controls merged implementation state",
        "No direct cross-service database access",
        "No inventing schemas/routes without contracts",
        "Sandeep review for privacy/data/security changes",
      ],
      action: "No product files changed; policy handoff only",
    },
    null,
    2,
  ),
);
console.log("PASS: Sandeep policy context handed off.");
