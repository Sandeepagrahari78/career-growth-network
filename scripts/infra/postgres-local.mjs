import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const composeFile = "infra/docker/docker-compose.postgres.yml";
const configPath = resolve(repoRoot, "config/infra/postgres-databases.v1.json");

function safeIdentifier(value) {
  assert.match(value, /^[a-z][a-z0-9_]*$/);
  return value;
}

export function loadDatabaseConfig() {
  return JSON.parse(readFileSync(configPath, "utf8"));
}

export function getServiceConfig(serviceName) {
  const config = loadDatabaseConfig();
  const service = config.services.find(
    (entry) => entry.service === serviceName,
  );

  if (!service) {
    throw new Error(`Unknown CGN database service: ${serviceName}`);
  }

  safeIdentifier(service.database);
  safeIdentifier(service.ownerRole);
  return service;
}

export function validateDatabaseConfig(config = loadDatabaseConfig()) {
  assert.equal(config.contract, "cgn.postgres-databases.v1");
  assert.equal(config.engine, "postgresql");
  assert.equal(config.majorVersion, 16);
  assert.equal(config.admin.user, "cgn_admin");
  assert.equal(config.admin.passwordEnv, "CGN_POSTGRES_PASSWORD");

  const services = new Set();
  const databases = new Set();
  const owners = new Set();
  const connectionEnvs = new Set();

  for (const service of config.services) {
    assert.ok(!services.has(service.service));
    assert.ok(!databases.has(service.database));
    assert.ok(!owners.has(service.ownerRole));
    assert.ok(!connectionEnvs.has(service.connectionEnv));

    safeIdentifier(service.service);
    safeIdentifier(service.database);
    safeIdentifier(service.ownerRole);
    assert.match(service.connectionEnv, /^CGN_[A-Z0-9_]+_DATABASE_URL$/);

    services.add(service.service);
    databases.add(service.database);
    owners.add(service.ownerRole);
    connectionEnvs.add(service.connectionEnv);
  }

  return true;
}

function requirePassword() {
  if (!process.env.CGN_POSTGRES_PASSWORD) {
    throw new Error(
      "CGN_POSTGRES_PASSWORD must be set in the environment. Do not commit it.",
    );
  }
}

function composeArgs(args) {
  return ["compose", "-f", composeFile, ...args];
}

function compose(args, options = {}) {
  const execOptions = {
    cwd: repoRoot,
    env: process.env,
    maxBuffer: 64 * 1024 * 1024,
  };

  if (options.inherit) {
    execOptions.stdio = "inherit";
  } else if (options.binary) {
    execOptions.input = options.input;
  } else {
    execOptions.encoding = "utf8";
    execOptions.input = options.input;
  }

  return execFileSync("docker", composeArgs(args), execOptions);
}

function composeSucceeds(args) {
  const result = spawnSync("docker", composeArgs(args), {
    cwd: repoRoot,
    env: process.env,
    stdio: "ignore",
  });

  return result.status === 0;
}

function runSql(database, sql, ownerRole = null) {
  safeIdentifier(database);

  let input = sql;
  if (ownerRole) {
    safeIdentifier(ownerRole);
    input = `SET ROLE "${ownerRole}";\n${sql}\nRESET ROLE;\n`;
  }

  return compose(
    [
      "exec",
      "-T",
      "postgres",
      "psql",
      "-X",
      "-v",
      "ON_ERROR_STOP=1",
      "-U",
      "cgn_admin",
      "-d",
      database,
      "-Atq",
    ],
    { input },
  );
}

function sleep(milliseconds) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, milliseconds));
}

function postgresHealthStatus() {
  let containerId;

  try {
    containerId = compose(["ps", "-q", "postgres"]).trim();
  } catch {
    return "missing";
  }

  if (!containerId) {
    return "missing";
  }

  try {
    return execFileSync(
      "docker",
      ["inspect", "--format", "{{.State.Health.Status}}", containerId],
      {
        cwd: repoRoot,
        env: process.env,
        encoding: "utf8",
      },
    ).trim();
  } catch {
    return "starting";
  }
}

export async function up() {
  requirePassword();
  validateDatabaseConfig();
  execFileSync("docker", ["info"], { stdio: "ignore" });
  compose(["up", "-d"], { inherit: true });

  for (let attempt = 1; attempt <= 60; attempt += 1) {
    if (postgresHealthStatus() === "healthy") {
      const acceptsConnections = composeSucceeds([
        "exec",
        "-T",
        "postgres",
        "pg_isready",
        "-U",
        "cgn_admin",
        "-d",
        "postgres",
      ]);

      if (acceptsConnections) {
        console.log(
          "CGN local PostgreSQL is healthy and initialization is complete.",
        );
        return;
      }
    }

    await sleep(1000);
  }

  throw new Error(
    "CGN local PostgreSQL did not become healthy within 60 seconds.",
  );
}

export function verify() {
  requirePassword();
  const config = loadDatabaseConfig();
  validateDatabaseConfig(config);

  for (let index = 0; index < config.services.length; index += 1) {
    const service = config.services[index];
    const other = config.services[(index + 1) % config.services.length];

    const owner = runSql(
      "postgres",
      `SELECT pg_get_userbyid(datdba) FROM pg_database WHERE datname = '${service.database}';`,
    ).trim();
    assert.equal(owner, service.ownerRole);

    const canLogin = runSql(
      "postgres",
      `SELECT rolcanlogin FROM pg_roles WHERE rolname = '${service.ownerRole}';`,
    ).trim();
    assert.equal(canLogin, "f");

    const crossServiceConnect = runSql(
      "postgres",
      `SELECT has_database_privilege('${other.ownerRole}', '${service.database}', 'CONNECT');`,
    ).trim();
    assert.equal(
      crossServiceConnect,
      "f",
      `${other.ownerRole} must not connect to ${service.database}`,
    );
  }

  console.log("PostgreSQL service database ownership verification passed.");
}

export function migrate(serviceName, sqlFile) {
  requirePassword();
  const service = getServiceConfig(serviceName);
  const migrationPath = resolve(repoRoot, sqlFile);

  if (!existsSync(migrationPath) || !migrationPath.endsWith(".sql")) {
    throw new Error(`Migration SQL file not found: ${sqlFile}`);
  }

  const sql = readFileSync(migrationPath, "utf8");
  runSql(service.database, sql, service.ownerRole);
  console.log(
    `Migration SQL executed as ${service.ownerRole} on ${service.database}.`,
  );
}

export function migrationSmoke() {
  const relativePath = "tests/fixtures/postgres/migration-smoke.sql";
  migrate("identity", relativePath);
  console.log("PostgreSQL service-scoped migration smoke passed.");
}

export function backup(serviceName, outputPath) {
  requirePassword();
  const service = getServiceConfig(serviceName);
  const targetPath = resolve(repoRoot, outputPath);
  mkdirSync(dirname(targetPath), { recursive: true });

  const dump = compose(
    [
      "exec",
      "-T",
      "postgres",
      "pg_dump",
      "-U",
      "cgn_admin",
      "-d",
      service.database,
      "-Fc",
    ],
    { binary: true },
  );

  writeFileSync(targetPath, dump);
  console.log(`Backup written to ${targetPath}`);
}

export function backupRestoreSmoke() {
  requirePassword();
  const service = getServiceConfig("identity");
  const restoreDatabase = "cgn_identity_restore_smoke";
  const smokeTable = "cgn_backup_restore_smoke";

  safeIdentifier(restoreDatabase);
  safeIdentifier(smokeTable);

  try {
    runSql(
      service.database,
      `DROP TABLE IF EXISTS public.${smokeTable};
CREATE TABLE public.${smokeTable} (marker text NOT NULL);
INSERT INTO public.${smokeTable} (marker) VALUES ('backup-ok');`,
      service.ownerRole,
    );

    const dump = compose(
      [
        "exec",
        "-T",
        "postgres",
        "pg_dump",
        "-U",
        "cgn_admin",
        "-d",
        service.database,
        "-Fc",
      ],
      { binary: true },
    );

    runSql(
      "postgres",
      `DROP DATABASE IF EXISTS ${restoreDatabase} WITH (FORCE);`,
    );
    runSql(
      "postgres",
      `CREATE DATABASE ${restoreDatabase} OWNER ${service.ownerRole};`,
    );
    runSql(
      "postgres",
      `REVOKE CONNECT, TEMPORARY ON DATABASE ${restoreDatabase} FROM PUBLIC;`,
    );

    compose(
      [
        "exec",
        "-T",
        "postgres",
        "pg_restore",
        "-U",
        "cgn_admin",
        "-d",
        restoreDatabase,
        "--no-owner",
        `--role=${service.ownerRole}`,
      ],
      { binary: true, input: dump },
    );

    const restoredCount = runSql(
      restoreDatabase,
      `SELECT count(*) FROM public.${smokeTable} WHERE marker = 'backup-ok';`,
    ).trim();
    assert.equal(restoredCount, "1");

    console.log("PostgreSQL backup/restore smoke passed.");
  } finally {
    try {
      runSql(
        "postgres",
        `DROP DATABASE IF EXISTS ${restoreDatabase} WITH (FORCE);`,
      );
    } catch {
      // Preserve the original failure while still attempting source cleanup.
    }

    try {
      runSql(
        service.database,
        `DROP TABLE IF EXISTS public.${smokeTable};`,
        service.ownerRole,
      );
    } catch {
      // Preserve the original failure.
    }
  }
}

export function down({ purge = false } = {}) {
  const args = ["down", "--remove-orphans"];
  if (purge) {
    args.push("-v");
  }

  compose(args, { inherit: true });
  console.log(
    purge
      ? "CGN local PostgreSQL stopped and local volume removed."
      : "CGN local PostgreSQL stopped; local volume preserved.",
  );
}

async function main() {
  const [command, ...args] = process.argv.slice(2);

  switch (command) {
    case "up":
      await up();
      break;
    case "verify":
      verify();
      break;
    case "migrate":
      if (args.length !== 2) {
        throw new Error(
          "Usage: node scripts/infra/postgres-local.mjs migrate <service> <sql-file>",
        );
      }
      migrate(args[0], args[1]);
      break;
    case "migration-smoke":
      migrationSmoke();
      break;
    case "backup":
      if (args.length !== 2) {
        throw new Error(
          "Usage: node scripts/infra/postgres-local.mjs backup <service> <output-file>",
        );
      }
      backup(args[0], args[1]);
      break;
    case "backup-restore-smoke":
      backupRestoreSmoke();
      break;
    case "down":
      down();
      break;
    case "reset":
      down({ purge: true });
      break;
    default:
      throw new Error(
        "Commands: up, verify, migrate, migration-smoke, backup, backup-restore-smoke, down, reset",
      );
  }
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
