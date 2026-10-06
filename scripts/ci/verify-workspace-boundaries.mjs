import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const contractFile =
  "packages/contracts/architecture/workspace-boundaries.v1.json";
const boundaryPath = join(repoRoot, contractFile);

export function loadWorkspaceBoundaries() {
  return JSON.parse(readFileSync(boundaryPath, "utf8"));
}

function categoryForPath(packagePath, boundaries) {
  const normalized = packagePath.replaceAll("\\", "/");
  const roots = boundaries.roots;

  if (normalized.startsWith(`${roots.apps}/`)) {
    return "apps";
  }

  if (normalized.startsWith(`${roots.services}/`)) {
    return "services";
  }

  if (normalized.startsWith(`${roots.sharedPackages}/`)) {
    return "sharedPackages";
  }

  throw new Error(
    `Package is outside approved workspace roots: ${packagePath}`,
  );
}

export function discoverWorkspacePackages(
  root = repoRoot,
  boundaries = loadWorkspaceBoundaries(),
) {
  const packages = [];

  for (const rootName of Object.values(boundaries.roots)) {
    const rootPath = join(root, rootName);
    const entries = readdirSync(rootPath, { withFileTypes: true });

    for (const entry of entries) {
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
  const dependencies = {
    ...(manifest.dependencies ?? {}),
    ...(manifest.devDependencies ?? {}),
    ...(manifest.peerDependencies ?? {}),
    ...(manifest.optionalDependencies ?? {}),
  };

  return new Set(Object.keys(dependencies));
}

function allowedCategoriesFor(category, boundaries) {
  if (category === "apps") {
    return boundaries.rules.appsMayDependOn;
  }

  if (category === "services") {
    return boundaries.rules.servicesMayDependOn;
  }

  if (category === "sharedPackages") {
    return boundaries.rules.sharedPackagesMayDependOn;
  }

  throw new Error(`Unknown workspace category: ${category}`);
}

export function validateWorkspaceGraph(
  packages,
  boundaries = loadWorkspaceBoundaries(),
) {
  assert.equal(boundaries.contract, "cgn.workspace-boundaries.v1");

  const byName = new Map();

  for (const workspacePackage of packages) {
    const { manifest, path, category } = workspacePackage;

    assert.ok(
      manifest.name.startsWith(boundaries.packagePrefix),
      `${path} must use the ${boundaries.packagePrefix} package namespace`,
    );
    assert.equal(manifest.private, true, `${path} must remain private`);

    if (byName.has(manifest.name)) {
      const firstPath = byName.get(manifest.name).path;
      throw new Error(
        `Duplicate workspace package name ${manifest.name}: ${firstPath} and ${path}`,
      );
    }

    allowedCategoriesFor(category, boundaries);
    byName.set(manifest.name, workspacePackage);
  }

  for (const workspacePackage of packages) {
    const allowed = allowedCategoriesFor(workspacePackage.category, boundaries);

    for (const dependencyName of allDependencyNames(
      workspacePackage.manifest,
    )) {
      const target = byName.get(dependencyName);

      if (!target) {
        continue;
      }

      const message =
        `${workspacePackage.manifest.name} (${workspacePackage.category}) ` +
        `must not depend directly on ${target.manifest.name} ` +
        `(${target.category})`;

      assert.ok(allowed.includes(target.category), message);
    }
  }

  return true;
}

export function validateWorkspaceFile(
  root = repoRoot,
  boundaries = loadWorkspaceBoundaries(),
) {
  const workspacePath = join(root, "pnpm-workspace.yaml");
  const workspace = readFileSync(workspacePath, "utf8");

  for (const rootName of Object.values(boundaries.roots)) {
    const doubleQuoted = `"${rootName}/*"`;
    const singleQuoted = `'${rootName}/*'`;

    assert.ok(
      workspace.includes(doubleQuoted) || workspace.includes(singleQuoted),
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
