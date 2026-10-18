import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const modelPath = "docs/security/CGN-66-threat-model.md";
const model = readFileSync(resolve(repoRoot, modelPath), "utf8");

test("threat model covers the ticket's required trust boundaries", () => {
  for (const area of [
    "Identity and consent",
    "Web and Android clients",
    "Gateway / BFF",
    "Owning services and databases",
    "Events and projections",
    "Files and evidence",
    "AI provider boundary",
    "Admin / operations",
  ]) {
    assert.ok(model.includes(area), `missing threat area: ${area}`);
  }
  assert.match(model, /trust boundaries/i);
  assert.match(model, /assets and security objectives/i);
  assert.match(model, /mitigation/i);
  assert.match(model, /acceptance checklist/i);
  assert.match(model, /Residual risks and review boundary/i);
});

test("privacy and abuse acceptance cases include minors, consent, blocks, tokens and projections", () => {
  const normalizedModel = model.toLowerCase().replace(/\s+/g, " ");
  for (const requirement of [
    "marks, personal timetable and study hours",
    "revoked consent",
    "block",
    "credentials/tokens",
    "private message bodies",
    "private evidence files",
    "AI conversation history",
    "no verified production identity api",
  ]) {
    assert.ok(normalizedModel.includes(requirement.toLowerCase()), requirement);
  }
  assert.match(model, /adult\/minor contact/);
  assert.match(
    model,
    /A stale feed, story, notification, search or Admin projection cannot reveal content denied/,
  );
});

test("the document marks implementation limits and its local references resolve", () => {
  assert.match(model, /not evidence\s+that a product API/i);
  assert.match(model, /no verified production Identity API/i);

  const links = [...model.matchAll(/\]\(([^)]+)\)/g)].map(
    ([, target]) => target,
  );
  assert.ok(links.length > 0);
  for (const target of links) {
    if (/^[a-z]+:\/\//i.test(target) || target.startsWith("#")) continue;
    const localPath = target.split("#")[0];
    assert.ok(
      existsSync(resolve(dirname(resolve(repoRoot, modelPath)), localPath)),
      `broken local link: ${target}`,
    );
  }
});

test("bounded-context document links to the threat-model baseline", () => {
  const map = readFileSync(
    resolve(repoRoot, "docs/architecture/bounded-context-map.md"),
    "utf8",
  );
  assert.ok(map.includes("../security/CGN-66-threat-model.md"));
  const normalizedMap = map.replace(/\s+/g, " ");
  assert.match(
    normalizedMap,
    /does not claim that the planned product runtimes or controls already exist/i,
  );
});
