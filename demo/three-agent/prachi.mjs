import { existsSync, readFileSync, writeFileSync } from "node:fs";
import assert from "node:assert/strict";

const prior = JSON.parse(
  readFileSync(".cgn/demo/three-agent/sandeep-policy.json", "utf8"),
);
const modules = readFileSync("docs/architecture/MODULE_DEPENDENCIES.md", "utf8");
assert.equal(prior.role, "Sandeep — architecture review simulation");
assert(prior.constraints.includes("No direct cross-service database access"));
assert.match(modules, /apps\/web/);
assert(existsSync("apps/web/README.md"));

writeFileSync(
  ".cgn/demo/three-agent/prachi-handoff.json",
  JSON.stringify(
    {
      role: "Prachi — frontend impact simulation",
      previousOwner: prior.role,
      existingPath: "apps/web/",
      implemented: false,
      recommendation:
        "Inspect current Jira and Figma before changes; coordinate missing APIs with owning service.",
      preservedRules: prior.constraints,
      action: "No product files changed; frontend impact handoff only",
    },
    null,
    2,
  ),
);
console.log("PASS: Prachi consumed Sandeep constraints and handed off frontend impact.");
