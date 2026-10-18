import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  canonicalizeSkillCatalog,
  serializeSkillCatalog,
  validateSkillCatalog,
} from "../../services/career/catalog/validate-skill-catalog.mjs";

const catalogUrl = new URL(
  "../../services/career/catalog/skills.v1.json",
  import.meta.url,
);
const schemaUrl = new URL(
  "../../packages/contracts/schemas/skill-catalog.v1.schema.json",
  import.meta.url,
);

async function readJson(url) {
  return JSON.parse(await readFile(url, "utf8"));
}

function copyCatalog(catalog) {
  return structuredClone(catalog);
}

test("CGN-75 publishes the versioned shared shape and validates its catalog", async () => {
  const schema = await readJson(schemaUrl);
  const catalog = await readJson(catalogUrl);

  assert.equal(schema.title, "SkillCatalogV1");
  assert.equal(schema.additionalProperties, false);
  assert.deepEqual(schema.required, ["schemaVersion", "catalogVersion", "skills"]);
  assert.deepEqual(validateSkillCatalog(catalog), []);
  assert.equal(serializeSkillCatalog(catalog), await readFile(catalogUrl, "utf8"));

  const invalidVersion = copyCatalog(catalog);
  invalidVersion.catalogVersion = "01.0.0";
  assert.ok(validateSkillCatalog(invalidVersion).some((issue) => issue.includes("MAJOR.MINOR.PATCH")));
});

test("canonical IDs are unique and never derived from display text", async () => {
  const catalog = await readJson(catalogUrl);
  const fixture = copyCatalog(catalog);
  fixture.skills = [
    {
      id: "skill.fixture_one",
      displayName: "Fixture One",
      aliases: [],
      lifecycle: "active",
    },
    {
      id: "skill.fixture_two",
      displayName: "Fixture Two",
      aliases: [],
      lifecycle: "active",
    },
  ];
  const duplicateId = copyCatalog(fixture);
  duplicateId.skills[1].id = duplicateId.skills[0].id;
  assert.ok(validateSkillCatalog(duplicateId).some((issue) => issue.includes("duplicates")));

  const renamed = copyCatalog(fixture);
  renamed.skills[0].displayName = "Flexible working";
  assert.equal(renamed.skills[0].id, "skill.fixture_one");
  assert.deepEqual(validateSkillCatalog(renamed), []);
});

test("normalized aliases and display names resolve to only one skill", async () => {
  const catalog = await readJson(catalogUrl);
  catalog.skills = [
    {
      id: "skill.fixture_one",
      displayName: "Fixture One",
      aliases: ["Adaptiveness"],
      lifecycle: "active",
    },
    {
      id: "skill.fixture_two",
      displayName: "Fixture Two",
      aliases: [],
      lifecycle: "active",
    },
  ];
  const duplicateAlias = copyCatalog(catalog);
  duplicateAlias.skills[1].aliases.push("  ADAPTIVENESS ");
  assert.ok(validateSkillCatalog(duplicateAlias).some((issue) => issue.includes("conflicts")));

  const duplicateWithinEntry = copyCatalog(catalog);
  duplicateWithinEntry.skills[0].aliases.push("adaptiveness");
  assert.ok(validateSkillCatalog(duplicateWithinEntry).some((issue) => issue.includes("duplicate alias")));
});

test("deprecated skill replacements must reference a different active catalog ID", async () => {
  const catalog = await readJson(catalogUrl);
  catalog.skills = [
    {
      id: "skill.fixture_one",
      displayName: "Fixture One",
      aliases: [],
      lifecycle: "deprecated",
    },
    {
      id: "skill.fixture_two",
      displayName: "Fixture Two",
      aliases: [],
      lifecycle: "active",
    },
  ];
  const deprecated = copyCatalog(catalog);
  deprecated.skills[0].replacementId = "skill.missing";
  assert.ok(validateSkillCatalog(deprecated).some((issue) => issue.includes("references missing")));

  deprecated.skills[0].replacementId = deprecated.skills[0].id;
  assert.ok(validateSkillCatalog(deprecated).some((issue) => issue.includes("cannot reference itself")));

  deprecated.skills[0].replacementId = deprecated.skills[1].id;
  assert.deepEqual(validateSkillCatalog(deprecated), []);
});

test("canonical serialization is stable across input ordering", async () => {
  const catalog = await readJson(catalogUrl);
  const reversed = copyCatalog(catalog);
  reversed.skills = [
    {
      id: "skill.fixture_two",
      displayName: "Fixture Two",
      aliases: ["Zed", "Beta"],
      lifecycle: "active",
    },
    {
      id: "skill.fixture_one",
      displayName: "Fixture One",
      aliases: ["Alpha", "Able"],
      lifecycle: "active",
    },
  ];
  const reordered = copyCatalog(reversed);
  reordered.skills.reverse();
  reordered.skills[1].aliases.reverse();
  assert.equal(serializeSkillCatalog(reversed), serializeSkillCatalog(reordered));
  assert.deepEqual(
    canonicalizeSkillCatalog(reversed).skills.map((skill) => skill.id),
    ["skill.fixture_one", "skill.fixture_two"],
  );
});
