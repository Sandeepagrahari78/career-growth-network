import { execFileSync } from "node:child_process";

const releaseSha = process.argv[2];

if (!releaseSha || !/^[0-9a-f]{40}$/i.test(releaseSha)) {
  console.error("A full 40-character release SHA is required.");
  process.exit(1);
}

try {
  execFileSync("git", ["cat-file", "-e", `${releaseSha}^{commit}`], { stdio: "ignore" });
  execFileSync("git", ["merge-base", "--is-ancestor", releaseSha, "origin/main"], { stdio: "ignore" });
} catch {
  console.error("Release SHA is not an approved commit on main history.");
  process.exit(1);
}

console.log(`Release SHA verified on main history: ${releaseSha}`);
