import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  canonicalizeTrackCatalog,
  serializeTrackCatalog,
  validateTrackCatalog,
} from "../../services/career/catalog/validate-track-catalog.mjs";

const trackUrl = new URL(
  "../../services/career/catalog/tracks.v1.json",
  import.meta.url,
);
const skillUrl = new URL(
  "../../services/career/catalog/skills.v1.json",
  import.meta.url,
);
const schemaUrl = new URL(
  "../../packages/contracts/schemas/career-track-catalog.v1.schema.json",
  import.meta.url,
);

async function readJson(url) {
  return JSON.parse(await readFile(url, "utf8"));
}

function copy(value) {
  return structuredClone(value);
}

test("CGN-76 publishes a valid AI Engineer track against the canonical skill catalog", async () => {
  const schema = await readJson(schemaUrl);
  const catalog = await readJson(trackUrl);
  const skills = await readJson(skillUrl);

  assert.equal(schema.title, "CareerTrackCatalogV1");
  assert.deepEqual(schema.required, [
    "schemaVersion",
    "catalogVersion",
    "skillCatalogVersion",
    "tracks",
  ]);
  assert.deepEqual(validateTrackCatalog(catalog, skills), []);
  assert.equal(catalog.skillCatalogVersion, skills.catalogVersion);
  assert.deepEqual(canonicalizeTrackCatalog(catalog), catalog);
});

test("track requirements distinguish required and optional skills", async () => {
  const catalog = await readJson(trackUrl);
  const requirements = new Set(
    catalog.tracks[0].skills.map((skill) => skill.requirement),
  );

  assert.deepEqual(requirements, new Set(["required", "optional"]));
  assert.ok(
    catalog.tracks[0].skills.every((skill) => skill.sourceIds.length > 0),
  );
});

test("every prerequisite and skill reference resolves within the canonical catalogs", async () => {
  const catalog = await readJson(trackUrl);
  const skills = await readJson(skillUrl);
  const missingSkill = copy(catalog);
  missingSkill.tracks[0].skills[0].skillId = "skill.missing";
  assert.ok(
    validateTrackCatalog(missingSkill, skills).some((issue) =>
      issue.includes("references missing skill.missing"),
    ),
  );

  const missingPrerequisite = copy(catalog);
  missingPrerequisite.tracks[0].skills[0].prerequisites.push("skill.missing");
  assert.ok(
    validateTrackCatalog(missingPrerequisite, skills).some((issue) =>
      issue.includes("prerequisites["),
    ),
  );
});

test("prerequisite graph is acyclic and cannot include self references", async () => {
  const catalog = await readJson(trackUrl);
  const skills = await readJson(skillUrl);
  const cycle = copy(catalog);
  cycle.tracks[0].skills.find(
    (skill) => skill.skillId === "skill.python_programming",
  ).prerequisites = ["skill.machine_learning_fundamentals"];
  assert.ok(
    validateTrackCatalog(cycle, skills).some((issue) =>
      issue.includes("must be acyclic"),
    ),
  );

  const selfReference = copy(catalog);
  selfReference.tracks[0].skills[0].prerequisites.push(
    selfReference.tracks[0].skills[0].skillId,
  );
  assert.ok(
    validateTrackCatalog(selfReference, skills).some((issue) =>
      issue.includes("cannot include the skill itself"),
    ),
  );
});

test("source metadata must be versioned, HTTPS and linked from each track skill", async () => {
  const catalog = await readJson(trackUrl);
  const skills = await readJson(skillUrl);
  const invalidSource = copy(catalog);
  invalidSource.tracks[0].sources[0].url = "http://example.invalid/docs";
  assert.ok(
    validateTrackCatalog(invalidSource, skills).some((issue) =>
      issue.includes("must use HTTPS"),
    ),
  );

  const missingSource = copy(catalog);
  missingSource.tracks[0].skills[0].sourceIds = ["source.missing"];
  assert.ok(
    validateTrackCatalog(missingSource, skills).some((issue) =>
      issue.includes("references missing source.missing"),
    ),
  );
});

test("canonical serialization is stable across track skill and source ordering", async () => {
  const catalog = await readJson(trackUrl);
  const skills = await readJson(skillUrl);
  const reordered = copy(catalog);
  reordered.tracks[0].skills.reverse();
  reordered.tracks[0].sources.reverse();

  assert.equal(
    serializeTrackCatalog(catalog, skills),
    serializeTrackCatalog(reordered, skills),
  );
  assert.deepEqual(
    canonicalizeTrackCatalog(reordered).tracks[0].skills.map(
      (skill) => skill.skillId,
    ),
    [...reordered.tracks[0].skills.map((skill) => skill.skillId)].sort(),
  );
});
