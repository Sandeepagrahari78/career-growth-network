import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const TRACK_ID = /^track\.[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/;
const SKILL_ID = /^skill\.[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/;
const SOURCE_ID = /^source\.[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function compareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function hasCycle(skills) {
  const byId = new Map(skills.map((skill) => [skill.skillId, skill]));
  const visiting = new Set();
  const visited = new Set();

  function visit(skillId) {
    if (visiting.has(skillId)) return true;
    if (visited.has(skillId)) return false;
    visiting.add(skillId);
    for (const prerequisite of byId.get(skillId)?.prerequisites ?? []) {
      if (visit(prerequisite)) return true;
    }
    visiting.delete(skillId);
    visited.add(skillId);
    return false;
  }

  return skills.some((skill) => visit(skill.skillId));
}

function isIsoDate(value) {
  if (typeof value !== "string" || !ISO_DATE.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value
  );
}

function isHttpsUrl(value) {
  if (typeof value !== "string") return false;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

export function validateTrackCatalog(catalog, skillCatalog) {
  const issues = [];
  if (!catalog || typeof catalog !== "object" || Array.isArray(catalog)) {
    return ["catalog must be an object"];
  }
  if (catalog.schemaVersion !== 1) issues.push("schemaVersion must be 1");
  if (
    typeof catalog.catalogVersion !== "string" ||
    !SEMVER.test(catalog.catalogVersion)
  ) {
    issues.push("catalogVersion must use MAJOR.MINOR.PATCH format");
  }
  if (
    typeof catalog.skillCatalogVersion !== "string" ||
    !SEMVER.test(catalog.skillCatalogVersion)
  ) {
    issues.push("skillCatalogVersion must use MAJOR.MINOR.PATCH format");
  }
  if (catalog.skillCatalogVersion !== skillCatalog?.catalogVersion) {
    issues.push(
      "skillCatalogVersion must match the canonical skill catalog version",
    );
  }
  if (!Array.isArray(catalog.tracks) || catalog.tracks.length === 0) {
    return [...issues, "tracks must be a non-empty array"];
  }
  if (!Array.isArray(skillCatalog?.skills)) {
    return [...issues, "skillCatalog.skills must be an array"];
  }

  const canonicalSkillIds = new Set(
    skillCatalog.skills
      .map((skill) => skill?.id)
      .filter((id) => typeof id === "string"),
  );
  const trackIds = new Set();

  for (const [trackIndex, track] of catalog.tracks.entries()) {
    const path = `tracks[${trackIndex}]`;
    if (!track || typeof track !== "object" || Array.isArray(track)) {
      issues.push(`${path} must be an object`);
      continue;
    }
    if (typeof track.id !== "string" || !TRACK_ID.test(track.id)) {
      issues.push(`${path}.id must be a stable track.<snake_case> ID`);
    } else if (trackIds.has(track.id)) {
      issues.push(`${path}.id duplicates ${track.id}`);
    } else {
      trackIds.add(track.id);
    }
    if (typeof track.displayName !== "string" || !track.displayName.trim()) {
      issues.push(`${path}.displayName must be non-empty`);
    }
    if (!Array.isArray(track.skills) || track.skills.length === 0) {
      issues.push(`${path}.skills must be a non-empty array`);
      continue;
    }
    if (!Array.isArray(track.sources) || track.sources.length === 0) {
      issues.push(`${path}.sources must be a non-empty array`);
    }

    const sourceIds = new Set();
    for (const [sourceIndex, source] of (track.sources ?? []).entries()) {
      const sourcePath = `${path}.sources[${sourceIndex}]`;
      if (!source || typeof source !== "object" || Array.isArray(source)) {
        issues.push(`${sourcePath} must be an object`);
        continue;
      }
      if (typeof source.id !== "string" || !SOURCE_ID.test(source.id)) {
        issues.push(`${sourcePath}.id must be a stable source.<kebab-case> ID`);
      } else if (sourceIds.has(source.id)) {
        issues.push(`${sourcePath}.id duplicates ${source.id}`);
      } else {
        sourceIds.add(source.id);
      }
      for (const field of ["publisher", "title", "version"]) {
        if (typeof source[field] !== "string" || !source[field].trim()) {
          issues.push(`${sourcePath}.${field} must be non-empty`);
        }
      }
      if (source.kind !== "official_documentation") {
        issues.push(`${sourcePath}.kind must be official_documentation`);
      }
      if (!isHttpsUrl(source.url)) {
        issues.push(`${sourcePath}.url must use HTTPS`);
      }
      if (!isIsoDate(source.accessedOn)) {
        issues.push(`${sourcePath}.accessedOn must be an ISO date`);
      }
    }

    const skillIds = new Set();
    for (const [skillIndex, skill] of track.skills.entries()) {
      const skillPath = `${path}.skills[${skillIndex}]`;
      if (!skill || typeof skill !== "object" || Array.isArray(skill)) {
        issues.push(`${skillPath} must be an object`);
        continue;
      }
      if (typeof skill.skillId !== "string" || !SKILL_ID.test(skill.skillId)) {
        issues.push(`${skillPath}.skillId must be a stable skill ID`);
      } else if (skillIds.has(skill.skillId)) {
        issues.push(`${skillPath}.skillId duplicates ${skill.skillId}`);
      } else {
        skillIds.add(skill.skillId);
      }
      if (
        typeof skill.skillId === "string" &&
        !canonicalSkillIds.has(skill.skillId)
      ) {
        issues.push(`${skillPath}.skillId references missing ${skill.skillId}`);
      }
      if (
        skill.requirement !== "required" &&
        skill.requirement !== "optional"
      ) {
        issues.push(`${skillPath}.requirement must be required or optional`);
      }
      if (!Array.isArray(skill.prerequisites)) {
        issues.push(`${skillPath}.prerequisites must be an array`);
      } else {
        const prerequisiteIds = new Set();
        for (const [
          prerequisiteIndex,
          prerequisite,
        ] of skill.prerequisites.entries()) {
          if (
            typeof prerequisite !== "string" ||
            !SKILL_ID.test(prerequisite)
          ) {
            issues.push(
              `${skillPath}.prerequisites[${prerequisiteIndex}] must be a stable skill ID`,
            );
          }
          if (prerequisite === skill.skillId) {
            issues.push(
              `${skillPath}.prerequisites cannot include the skill itself`,
            );
          }
          if (prerequisiteIds.has(prerequisite)) {
            issues.push(
              `${skillPath}.prerequisites contains duplicate ${prerequisite}`,
            );
          }
          prerequisiteIds.add(prerequisite);
        }
      }
      if (!Array.isArray(skill.sourceIds) || skill.sourceIds.length === 0) {
        issues.push(`${skillPath}.sourceIds must be a non-empty array`);
      } else {
        const usedSourceIds = new Set();
        for (const [sourceIndex, sourceId] of skill.sourceIds.entries()) {
          if (typeof sourceId !== "string" || !sourceId.trim()) {
            issues.push(
              `${skillPath}.sourceIds[${sourceIndex}] must be non-empty`,
            );
          } else if (!sourceIds.has(sourceId)) {
            issues.push(
              `${skillPath}.sourceIds[${sourceIndex}] references missing ${sourceId}`,
            );
          }
          if (usedSourceIds.has(sourceId)) {
            issues.push(
              `${skillPath}.sourceIds contains duplicate ${sourceId}`,
            );
          }
          usedSourceIds.add(sourceId);
        }
      }
    }

    for (const [skillIndex, skill] of track.skills.entries()) {
      for (const [prerequisiteIndex, prerequisite] of (
        skill?.prerequisites ?? []
      ).entries()) {
        if (!skillIds.has(prerequisite)) {
          issues.push(
            `${path}.skills[${skillIndex}].prerequisites[${prerequisiteIndex}] references missing ${prerequisite}`,
          );
        }
      }
    }
    if (
      track.skills.every((skill) => Array.isArray(skill?.prerequisites)) &&
      hasCycle(track.skills)
    ) {
      issues.push(`${path}.skills prerequisite graph must be acyclic`);
    }
  }

  return issues;
}

export function canonicalizeTrackCatalog(catalog) {
  return {
    schemaVersion: catalog.schemaVersion,
    catalogVersion: catalog.catalogVersion,
    skillCatalogVersion: catalog.skillCatalogVersion,
    tracks: [...catalog.tracks]
      .sort((left, right) => compareText(left.id, right.id))
      .map((track) => ({
        id: track.id,
        displayName: track.displayName.trim(),
        skills: [...track.skills]
          .sort((left, right) => compareText(left.skillId, right.skillId))
          .map((skill) => ({
            skillId: skill.skillId,
            requirement: skill.requirement,
            prerequisites: [...skill.prerequisites].sort(compareText),
            sourceIds: [...skill.sourceIds].sort(compareText),
          })),
        sources: [...track.sources]
          .sort((left, right) => compareText(left.id, right.id))
          .map((source) => ({ ...source })),
      })),
  };
}

export function serializeTrackCatalog(catalog, skillCatalog) {
  const issues = validateTrackCatalog(catalog, skillCatalog);
  if (issues.length > 0)
    throw new Error(`Invalid track catalog:\n${issues.join("\n")}`);
  return `${JSON.stringify(canonicalizeTrackCatalog(catalog), null, 2)}\n`;
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function runCli() {
  const directory = new URL("./", import.meta.url);
  const trackCatalog = await readJson(
    fileURLToPath(new URL("tracks.v1.json", directory)),
  );
  const skillCatalog = await readJson(
    fileURLToPath(new URL("skills.v1.json", directory)),
  );
  const issues = validateTrackCatalog(trackCatalog, skillCatalog);
  if (issues.length > 0) {
    process.stderr.write(`${issues.map((issue) => `- ${issue}`).join("\n")}\n`);
    process.exitCode = 1;
    return;
  }
  process.stdout.write(
    `Career track catalog v${trackCatalog.catalogVersion}: ${trackCatalog.tracks.length} track(s) valid.\n`,
  );
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  await runCli();
}
