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

test("requires handoff for source, infra and CI changes", () => {
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

test("docs-only PRs do not require a handoff", () => {
  const docs = ["README.md", "docs/architecture/README.md"];
  assert.equal(needsTicketHandoff(docs), false);
  assert.equal(needsTicketHandoff([]), false);
});

test("only CGN-scoped branch identifiers are valid", () => {
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
  const errors = validateTicketHandoff("CGN-220", complete("CGN-285"));
  assert.match(errors.join("; "), /identify ticket CGN-220/);
});

test("rejects empty and placeholder handoff sections", () => {
  const missing = complete().replace("- Verified on this PR.", "");
  const placeholder = complete().replace("- Verified on this PR.", "TODO");
  const missingErrors = validateTicketHandoff("CGN-285", missing);
  const placeholderErrors = validateTicketHandoff("CGN-285", placeholder);
  assert.match(missingErrors.join("; "), /Missing meaningful section/);
  assert.match(placeholderErrors.join("; "), /Missing meaningful section/);
});
