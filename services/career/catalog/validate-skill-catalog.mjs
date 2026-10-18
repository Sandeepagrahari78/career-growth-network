const SKILL_ID = /^skill\.[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/;
const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

function normalizeLabel(value) {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US");
}

function compareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

export function validateSkillCatalog(catalog) {
  const issues = [];
  if (!catalog || typeof catalog !== "object" || Array.isArray(catalog)) {
    return ["catalog must be an object"];
  }
  if (catalog.schemaVersion !== 1) issues.push("schemaVersion must be 1");
  if (typeof catalog.catalogVersion !== "string" || !SEMVER.test(catalog.catalogVersion)) {
    issues.push("catalogVersion must use MAJOR.MINOR.PATCH format");
  }
  if (!Array.isArray(catalog.skills)) return [...issues, "skills must be an array"];

  const ids = new Map();
  const labels = new Map();
  for (const [index, skill] of catalog.skills.entries()) {
    const path = `skills[${index}]`;
    if (!skill || typeof skill !== "object" || Array.isArray(skill)) {
      issues.push(`${path} must be an object`);
      continue;
    }
    if (typeof skill.id !== "string" || !SKILL_ID.test(skill.id)) {
      issues.push(`${path}.id must be a stable skill.<snake_case> ID`);
    } else if (ids.has(skill.id)) {
      issues.push(`${path}.id duplicates ${ids.get(skill.id)}`);
    } else {
      ids.set(skill.id, path);
    }
    if (typeof skill.displayName !== "string" || !skill.displayName.trim()) {
      issues.push(`${path}.displayName must be non-empty`);
    }
    if (!Array.isArray(skill.aliases)) {
      issues.push(`${path}.aliases must be an array`);
    } else {
      const aliasesInEntry = new Set();
      for (const [aliasIndex, alias] of skill.aliases.entries()) {
        if (typeof alias !== "string" || !alias.trim()) {
          issues.push(`${path}.aliases[${aliasIndex}] must be non-empty`);
          continue;
        }
        const normalized = normalizeLabel(alias);
        if (aliasesInEntry.has(normalized)) {
          issues.push(`${path}.aliases contains a duplicate alias: ${alias}`);
        }
        aliasesInEntry.add(normalized);
        const previous = labels.get(normalized);
        if (previous && previous.id !== skill.id) {
          issues.push(`${path}.aliases[${aliasIndex}] conflicts with ${previous.path}`);
        } else {
          labels.set(normalized, { id: skill.id, path: `${path}.aliases[${aliasIndex}]` });
        }
      }
    }
    if (skill.lifecycle !== "active" && skill.lifecycle !== "deprecated") {
      issues.push(`${path}.lifecycle must be active or deprecated`);
    }
    if (skill.replacementId !== undefined && skill.lifecycle !== "deprecated") {
      issues.push(`${path}.replacementId is only valid for a deprecated skill`);
    }
    if (skill.replacementId !== undefined &&
        (typeof skill.replacementId !== "string" || !SKILL_ID.test(skill.replacementId))) {
      issues.push(`${path}.replacementId must be a stable skill ID`);
    }
    if (typeof skill.displayName === "string" && skill.displayName.trim()) {
      const normalized = normalizeLabel(skill.displayName);
      const previous = labels.get(normalized);
      if (previous && previous.id !== skill.id) {
        issues.push(`${path}.displayName conflicts with ${previous.path}`);
      } else {
        labels.set(normalized, { id: skill.id, path: `${path}.displayName` });
      }
    }
  }

  for (const [index, skill] of catalog.skills.entries()) {
    if (typeof skill?.replacementId !== "string") continue;
    const target = catalog.skills.find((candidate) => candidate?.id === skill.replacementId);
    if (!target) {
      issues.push(`skills[${index}].replacementId references missing ${skill.replacementId}`);
    } else if (target.id === skill.id) {
      issues.push(`skills[${index}].replacementId cannot reference itself`);
    } else if (target.lifecycle !== "active") {
      issues.push(`skills[${index}].replacementId must reference an active skill`);
    }
  }
  return issues;
}

export function canonicalizeSkillCatalog(catalog) {
  const issues = validateSkillCatalog(catalog);
  if (issues.length > 0) throw new Error(`Invalid skill catalog:\n${issues.join("\n")}`);
  return {
    schemaVersion: catalog.schemaVersion,
    catalogVersion: catalog.catalogVersion,
    skills: [...catalog.skills]
      .sort((left, right) => compareText(left.id, right.id))
      .map((skill) => ({
        id: skill.id,
        displayName: skill.displayName.trim(),
        aliases: [...skill.aliases].sort((left, right) => compareText(normalizeLabel(left), normalizeLabel(right))),
        lifecycle: skill.lifecycle,
        ...(skill.replacementId ? { replacementId: skill.replacementId } : {}),
      })),
  };
}

export function serializeSkillCatalog(catalog) {
  return `${JSON.stringify(canonicalizeSkillCatalog(catalog), null, 2)}\n`;
}
