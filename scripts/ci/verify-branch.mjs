import { execFileSync } from "node:child_process";

function currentBranch() {
  if (process.env.GITHUB_HEAD_REF) {
    return process.env.GITHUB_HEAD_REF;
  }
  if (process.env.GITHUB_REF_NAME) {
    return process.env.GITHUB_REF_NAME;
  }
  return execFileSync("git", ["branch", "--show-current"], {
    encoding: "utf8",
  }).trim();
}

const branch = currentBranch();
const productionBranchPattern = /^CGN-[0-9]+-[A-Za-z0-9._-]+$/;
const specialPattern = /^(ci|hotfix)\/[A-Za-z0-9._-]+$/;

if (branch === "main") {
  console.log("Branch validation passed for main revalidation.");
  process.exit(0);
}

if (!productionBranchPattern.test(branch) && !specialPattern.test(branch)) {
  console.error(`Invalid CGN branch name: ${branch}`);
  console.error("Expected CGN-123-description, ci/name, or hotfix/name.");
  process.exit(1);
}

const ticketMatch = branch.match(/^(CGN-[0-9]+)-/);
console.log(
  ticketMatch
    ? `Branch validation passed. Jira scope: ${ticketMatch[1]}`
    : `Branch validation passed: ${branch}`,
);
