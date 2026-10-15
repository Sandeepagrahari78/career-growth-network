import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = process.cwd();
const args = process.argv.slice(2);

function arg(name, fallback = "") {
  const at = args.indexOf(name);
  if (at === -1) return fallback;
  if (at + 1 >= args.length || args[at + 1].startsWith("--")) {
    throw new Error("Expected value after " + name);
  }
  return args[at + 1];
}

function gitInfo() {
  try {
    return {
      branch: execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
        encoding: "utf8",
        cwd: root,
      }).trim(),
      sha: execFileSync("git", ["rev-parse", "HEAD"], {
        encoding: "utf8",
        cwd: root,
      }).trim(),
    };
  } catch {
    return { branch: "unavailable", sha: "unavailable" };
  }
}

function run() {
  const ticket = arg("--ticket");
  const domain = arg("--domain", "unspecified");
  if (!/^CGN-[1-9][0-9]*$/.test(ticket) && ticket !== "DEMO-001") {
    throw new Error("Provide a valid --ticket CGN-NNN (or DEMO-001 for the built-in regression demo).");
  }
  if (!/^[a-z][a-z0-9-]*$/.test(domain) && !(ticket === "DEMO-001" && domain === "Roadmap->Social")) {
    throw new Error("--domain must be a lowercase domain slug (except built-in DEMO-001).");
  }
  const output = arg("--out", ".cgn/context-" + ticket + ".md");
  const outPath = path.resolve(root, output);
  if (!outPath.startsWith(root + path.sep)) {
    throw new Error("Refusing output outside repository.");
  }

  const sources = [
    "AGENTS.md",
    "docs/architecture/PROJECT_FLOW.md",
    "docs/architecture/MODULE_DEPENDENCIES.md",
    "docs/architecture/AGENT_WORKFLOW.md",
    "docs/engineering-memory/00-product-north-star.md",
    "docs/engineering-memory/01-system-map.md",
    "docs/engineering-memory/02-domain-ownership.md",
    "docs/engineering-memory/03-contract-registry.md",
    "docs/engineering-memory/04-decisions.md",
    "docs/engineering-memory/05-current-state.md",
    "docs/engineering-memory/06-known-risks.md",
    "docs/engineering-memory/07-handoff-protocol.md",
    "docs/engineering-memory/08-agent-rules.md",
  ];

  const workItem = "docs/work-items/" + ticket + ".md";
  const hasTicketExport = fs.existsSync(path.join(root, workItem));
  if (hasTicketExport) {
    sources.push(workItem);
  }

  // Include only explicitly referenced predecessor handoffs, not guessed ticket order.
  if (hasTicketExport) {
    const snapshot = fs.readFileSync(path.join(root, workItem), "utf8");
    const linked = [...new Set(snapshot.match(/\bCGN-[1-9][0-9]*\b/g) || [])]
      .filter((item) => item !== ticket)
      .slice(0, 25);
    for (const relatedTicket of linked) {
      const handoff = "docs/handoffs/" + relatedTicket + ".md";
      if (fs.existsSync(path.join(root, handoff))) {
        sources.push(handoff);
      }
    }
  }

  const git = gitInfo();
  let body =
    "# CGN Agent Context Bundle\n\n" +
    "Ticket: " + ticket + "\n" +
    "Domain: " + domain + "\n" +
    "Git branch: " + git.branch + "\n" +
    "Git SHA: " + git.sha + "\n\n" +
    "> Generated from the current checkout. Jira is the work/dependency truth, " +
    "latest main is merged implementation truth, and contracts/ADRs are integration truth.\n\n" +
    "## Jira source freshness\n\n";
  if (hasTicketExport) {
    body +=
      "A local ticket export is included below. It may be stale: verify Jira status, " +
      "owner, blockers and acceptance criteria LIVE before editing code.\n\n";
  } else {
    body +=
      "**No local Jira ticket export found.** Open https://sandeepagrahari1.atlassian.net/browse/" +
      ticket +
      " and inspect the ticket, links and dependencies before coding. " +
      "This tool does NOT fetch Jira automatically or prove the ticket is ready.\n\n";
  }

  const handoffsDir = path.join(root, "docs/handoffs");
  if (fs.existsSync(handoffsDir)) {
    const names = fs.readdirSync(handoffsDir)
      .filter((name) => /^CGN-[0-9]+\.md$/.test(name))
      .sort();
    body += "## Available previous ticket handoffs (index only)\n\n";
    body += names.length ? names.map((name) => "- docs/handoffs/" + name).join("\n") + "\n\n" : "No handoffs yet.\n\n";
    body += "Read only verified relevant handoffs and related merged code. " +
      "A handoff file existing does not prove it has been merged.\n\n";
  }

  for (const rel of sources) {
    const full = path.join(root, rel);
    if (!fs.existsSync(full)) continue;
    body += "\n---\n\n## SOURCE: " + rel + "\n\n" + fs.readFileSync(full, "utf8").trim() + "\n";
  }

  body += "\n---\n\n## Required agent preflight\n\n";
  body += "- [ ] Jira live status, owner, acceptance criteria and blocked-by links checked.\n";
  body += "- [ ] Latest main fetched; source file/contract ownership inspected.\n";
  body += "- [ ] Exact proposed file impact and test plan written before implementation.\n";
  body += "- [ ] No missing interfaces, fabricated modules, or unauthorized secrets.\n";
  body += "- [ ] Ticket-specific handoff completed and PR CI green before merge.\n";

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, body);
  console.log("Generated " + path.relative(root, outPath));
  console.log(hasTicketExport ? "Jira snapshot included; verify it is current." : "WARNING: No offline Jira snapshot; live Jira review required.");
}

try {
  run();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
