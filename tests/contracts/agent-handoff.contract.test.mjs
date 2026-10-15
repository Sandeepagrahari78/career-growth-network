import test from "node:test";
import assert from "node:assert/strict";
import {
  needsTicketHandoff,
  ticketFromBranch,
  validateTicketHandoff,
  requiredSections,
} from "../../scripts/ci/agent-handoff-policy.mjs";

function complete(ticket = "CGN-285") {
  return (
    "# Handoff — " +
    ticket +
    "\n\nTicket: " +
    ticket +
    "\n" +
    requiredSections
      .map((section) => "\n## " + section + "\n\n- Verified on this PR.\n")
      .join("")
  );
}

test("requires scoped handoff for app, service, contract, infra and CI changes", () => {
  for (const p of [
    "apps/web/src/index.tsx",
    "services/identity/index.ts",
    "packages/contracts/api.json",
    "infra/helm/values.yaml",
    "scripts/ci/verify-agent-handoff.mjs",
    ".github/workflows/pr-ci.yml",
  ]) {
    assert.equal(needsTicketHandoff([p]), true, p);
  }
});

test("documentation-only PRs do not require handoff", () => {
  assert.equal(needsTicketHandoff(["README.md", "docs/architecture/README.md"]), false);
  assert.equal(needsTicketHandoff([]), false);
});

test("extracts only Jira-scoped branch identifiers", () => {
  assert.equal(ticketFromBranch("CGN-220-opportunity-publishing"), "CGN-220");
  assert.equal(ticketFromBranch("CGN-285-shared-agent-navigation"), "CGN-285");
  assert.equal(ticketFromBranch("hotfix"), null);
  assert.equal(ticketFromBranch("CGN-0-hack"), null);
  assert.equal(ticketFromBranch("CGN-220"), null);
  assert.equal(ticketFromBranch("CGN-220-../../main"), null);
});

test("complete handoff with matching ticket is valid", () => {
  assert.deepEqual(validateTicketHandoff("CGN-285", complete()), []);
});

test("rejects a handoff for a different ticket", () => {
  assert.match(
    validateTicketHandoff("CGN-220", complete("CGN-285")).join("; "),
    /identify ticket CGN-220/,
  );
});

test("rejects empty and placeholder handoff sections", () => {
  assert.match(
    validateTicketHandoff("CGN-285", complete().replace("- Verified on this PR.", "")).
      join("; "),
    /Missing meaningful section/,
  );
  assert.match(
    validateTicketHandoff("CGN-285", complete().replace("- Verified on this PR.", "TODO")).
      join("; "),
    /Missing meaningful section/,
  );
});
