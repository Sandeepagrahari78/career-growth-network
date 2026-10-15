// Pure, unit-testable PR handoff policy. The workflow supplies the trusted PR base SHA.
const scopePrefixes = [
  "apps/",
  "services/",
  "packages/",
  "infra/",
  "config/",
  "scripts/ci/",
  ".github/workflows/",
];

export function needsTicketHandoff(files) {
  return files.some((file) =>
    scopePrefixes.some((prefix) => file.startsWith(prefix)),
  );
}

export function ticketFromBranch(branch) {
  const match = /^CGN-([1-9][0-9]*)-[a-z0-9][a-z0-9-]*$/.exec(branch || "");
  return match ? "CGN-" + match[1] : null;
}

export const requiredSections = [
  "What changed",
  "Files/modules changed",
  "Contracts changed",
  "Events produced / consumed",
  "Database / migration / config changes",
  "Tests run",
  "Known limitations / risks",
  "Exact next step for next agent",
  "Rollback note",
  "Engineering Memory updated",
];

export function validateTicketHandoff(ticket, content) {
  const errors = [];
  if (!content.includes(ticket)) {
    errors.push("Handoff must identify ticket " + ticket);
  }

  const matches = [...content.matchAll(/^## (.+?)\s*$/gm)];
  const sectionContents = new Map();
  for (let i = 0; i < matches.length; i += 1) {
    const start = matches[i].index + matches[i][0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index : content.length;
    sectionContents.set(matches[i][1].trim(), content.slice(start, end).trim());
  }

  for (const label of requiredSections) {
    const body = sectionContents.get(label);
    if (!body || /^(?:TBD|TODO|N\/A|[-*]?)$/i.test(body.trim())) {
      errors.push("Missing meaningful section: ## " + label);
    }
  }
  return errors;
}
