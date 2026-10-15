// Offline Jira-verified platform scope. This is a PR file-path guardrail, not a
// substitute for live Jira dependency checks, code review or branch protection.
const allowedPlatforms = new Set(["web", "mobile"]);

export function platformsChanged(files) {
  const platforms = new Set();
  for (const file of files) {
    if (file.startsWith("apps/web/")) {
      platforms.add("web");
    }
    if (file.startsWith("apps/mobile/")) {
      platforms.add("mobile");
    }
  }
  return [...platforms].sort();
}

export function ticketFromBranch(branch) {
  const match = /^CGN-([1-9][0-9]*)-[a-z0-9][a-z0-9-]*$/.exec(branch || "");
  return match ? "CGN-" + match[1] : null;
}

export function checkRegistry(registry) {
  const errors = [];
  if (registry?.$schemaVersion !== 1 || !registry?.tickets) {
    return ["Missing or unsupported platform registry format"];
  }
  for (const [ticket, rule] of Object.entries(registry.tickets)) {
    if (!/^CGN-[1-9][0-9]*$/.test(ticket)) {
      errors.push("Invalid Jira ticket key in registry: " + ticket);
      continue;
    }
    if (
      !Array.isArray(rule.platforms) ||
      !rule.platforms.length ||
      rule.platforms.length > 2 ||
      new Set(rule.platforms).size !== rule.platforms.length ||
      rule.platforms.some((value) => !allowedPlatforms.has(value))
    ) {
      errors.push("Invalid platform list for " + ticket);
    }
    if (rule.platforms.length > 1 && rule.reviewRequired !== true) {
      errors.push("Both-platform ticket requires reviewRequired: " + ticket);
    }
    if (typeof rule.note !== "string" || !rule.note.trim()) {
      errors.push("Missing Jira scope rationale for " + ticket);
    }
  }
  return errors;
}

export function validatePlatformScope({ files, branch, registry }) {
  const errors = checkRegistry(registry);
  if (errors.length) {
    return errors;
  }
  const requested = platformsChanged(files);
  if (!requested.length) {
    return [];
  }
  const ticket = ticketFromBranch(branch);
  if (!ticket) {
    return ["Changes to app platforms require a CGN-NNN-description branch."];
  }
  const scope = registry.tickets[ticket];
  if (!scope) {
    return [
      "Unregistered platform ticket " +
        ticket +
        ". Verify LIVE Jira scope, add a reviewed registry entry, and update the ticket handoff.",
    ];
  }
  for (const platform of requested) {
    if (!scope.platforms.includes(platform)) {
      errors.push(
        ticket +
          " is assigned " +
          scope.platforms.join("+") +
          " but modifies apps/" +
          platform +
          "/. Split into the owning ticket or obtain reviewed cross-platform scope.",
      );
    }
  }
  return errors;
}
