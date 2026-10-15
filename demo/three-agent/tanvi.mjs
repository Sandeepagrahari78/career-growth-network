import { readFileSync, writeFileSync } from "node:fs";
import assert from "node:assert/strict";

const previous = JSON.parse(
  readFileSync(".cgn/demo/three-agent/prachi-handoff.json", "utf8"),
);
const context = readFileSync(".cgn/context-CGN-220-three-agent.md", "utf8");
const admin = readFileSync("docs/modules/admin-opportunities.md", "utf8");
assert.equal(previous.role, "Prachi — frontend impact simulation");
assert.equal(previous.implemented, false);
assert(previous.preservedRules.includes("Jira controls ticket scope"));
assert.match(context, /Ticket: CGN-220/);
assert.match(context, /No local Jira ticket export found/);
assert.match(admin, /no verified|no approved|not deployed/i);

writeFileSync(
  ".cgn/demo/three-agent/final-result.json",
  JSON.stringify(
    {
      mode: "offline, synthetic three-role handoff simulation",
      pass: true,
      roles: [
        "Sandeep — architecture review simulation",
        "Prachi — frontend impact simulation",
        "Tanvi — CGN-220 preflight simulation",
      ],
      jiraTicket: "CGN-220",
      outcome:
        "Tanvi must verify live Jira and dependencies before coding; no business implementation claimed.",
      preservedRules: previous.preservedRules,
      allChangesOnMain: false,
      productFeatureImplemented: false,
    },
    null,
    2,
  ),
);
console.log("PASS: Tanvi consumed previous handoffs and correctly stopped before missing Jira scope.");
