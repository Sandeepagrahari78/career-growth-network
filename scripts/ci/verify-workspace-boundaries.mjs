import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const boundaryPath = join(
  repoRoot,
  "packages/contracts/architecture/workspace-boundaries.v1.json",
);

export function loadWorkspaceBoundaries() {
  return JSON.parse(readFileSync(boundaryPath, "utf8"));
}

function categoryForPath(packagePath, boundaries) {
  const normalized = packagePath.replaceAll("\\", "/");

  if (normalized.startsWith(`${boundaries.roots.apps}/`)) {
    return "apps";
  }
  if (normalized.startsWith(`${boundaries.roots.services}/`)) {
    return "services";
  }
  if (normalized.startsWith(`${boundaries.roots.sharedPackages}/`)) {
    return "sharedPackages";
  }

  throw new Error(`Package is outside approved workspace roots: ${packagePath}`);
}

export function discoverWorkspacePackages(
  root = repoRoot,
  boundaries = loadWorkspaceBoundaries(),
) {
  const packages = [];

  for (const rootName of Object.values(boundaries.roots)) {
    const rootPath = join(root, rootName);

    for (const entry of readdirSync(rootPath, { withFileTypes: true })) {
      if (!entry.isDirectory()) {
        continue;
      }

      const packagePath = `${rootName}/${entry.name}`;
      const manifestPath = join(root, packagePath, "package.json");
      let manifest;

      try {
        manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
      } catch (error) {
        throw new Error(
          `Workspace directory ${packagePath} must contain a valid package.json: ${error.message}`,
        );
      }

      packages.push({
        path: packagePath,
        category: categoryForPath(packagePath, boundaries),
        manifest,
      });
    }
  }

  return packages;
}

function allDependencyNames(manifest) {
  return new Set(
    Object.keys({
      ...(manifest.dependencies ?? {}),
      ...(manifest.devDependencies ?? {}),
      ...(manifest.peerDependencies ?? {}),
      ...(manifest.optionalDependencies ?? {}),
    }),
  );
}

export function validateWorkspaceGraph(
  packages,
  boundaries = loadWorkspaceBoundaries(),
) {
  assert.equal(boundaries.contract, "cgn.workspace-boundaries.v1");

  const byName = new Map();

  for (const workspacePackage of packages) {
    const { manifest, path, category } = workspacePackage;

    assert.match(
      manifest.name,
      new RegExp(`^${boundaries.packagePrefix.replace("/", "\\/")}`),
      `${path} must use the ${boundaries.packagePrefix} package namespace`,
    );
    assert.equal(manifest.private, true, `${path} must remain private`);

    if (byName.has(manifest.name)) {
      throw new Error(
        `Duplicate workspace package name ${manifest.name}: ${byName.get(manifest.name).path} and ${path}`,
      );
    }

    byName.set(manifest.name, workspacePackage);

    if (!["apps", "services", "sharedPackages"].includes(category)) {
      throw new Error(`Unknown workspace category for ${path}: ${category}`);
    }
  }

  for (const workspacePackage of packages) {
    const allowedCategories =
      workspacePackage.category === "apps"
        ? boundaries.rules.appsMayDependOn
        : workspacePackage.category === "services"
          ? boundaries.rules.servicesMayDependOn
          : boundaries.rules.sharedPackagesMayDependOn;

    for (const dependencyName of allDependencyNames(workspacePackage.manifest)) {
      const target = byName.get(dependencyName);

      if (!target) {
        continue;
      }

      assert.ok(
        allowedCategories.includes(target.category),
        `${workspacePackage.manifest.name} (${workspacePackage.category}) must not depend directly on ${target.manifest.name} (${target.category})`,
      );
    }
  }

  return true;
}

export function validateWorkspaceFile(
  root = repoRoot,
  boundaries = loadWorkspaceBoundaries(),
) {
  const workspace = readFileSync(join(root, "pnpm-workspace.yaml"), "utf8");

  for (const rootName of Object.values(boundaries.roots)) {
    assert.match(
      workspace,
      new RegExp(`["']${rootName.replace("/", "\\/")}\\/\\*["']`),
      `pnpm-workspace.yaml must include ${rootName}/*`,
    );
  }

  return true;
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
  const boundaries = loadWorkspaceBoundaries();
  const packages = discoverWorkspacePackages(repoRoot, boundaries);
  validateWorkspaceFile(repoRoot, boundaries);
  validateWorkspaceGraph(packages, boundaries);
  console.log(
    `Workspace boundary validation passed for ${packages.length} packages.`,
  );
}
