import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";

mkdirSync(".cgn/demo/three-agent", { recursive: true });
const execute = (script, args = []) =>
  execFileSync(process.execPath, [script, ...args], { stdio: "inherit" });

execute("scripts/agent-context.mjs", [
  "--ticket",
  "CGN-285",
  "--domain",
  "cicd",
  "--out",
  ".cgn/context-CGN-285-three-agent.md",
]);
execute("demo/three-agent/sandeep.mjs");
execute("demo/three-agent/prachi.mjs");
execute("scripts/agent-context.mjs", [
  "--ticket",
  "CGN-220",
  "--domain",
  "admin",
  "--out",
  ".cgn/context-CGN-220-three-agent.md",
]);
execute("demo/three-agent/tanvi.mjs");
console.log(
  "SUCCESS: Sandeep -> Prachi -> Tanvi simulated handoffs preserved project boundaries.",
);
