import assert from "node:assert/strict";
import { execFileSync, spawn, spawnSync } from "node:child_process";
import {
  appendFileSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const containerName =
  process.env.CGN_PERFORMANCE_CONTAINER ?? "cgn-performance";
const endpoint = process.env.BASE_URL ?? "http://127.0.0.1:3001";
const dockerUser = `${process.getuid?.() ?? 0}:${process.getgid?.() ?? 0}`;
const capacity = JSON.parse(
  readFileSync(join(repoRoot, "config/performance/capacity.v1.json"), "utf8"),
);
const stagingValues = readFileSync(
  join(repoRoot, "infra/helm/values/health-demo-staging.yaml"),
  "utf8",
);

export function parseResourcePair(kind) {
  const lines = stagingValues.split(/\r?\n/);
  const index = lines.indexOf(`  ${kind}:`);
  assert.notEqual(index, -1, `health-demo staging must define ${kind}`);
  const cpu = lines[index + 1]?.trim().match(/^cpu:\s*(\S+)$/);
  const memory = lines[index + 2]?.trim().match(/^memory:\s*(\S+)$/);
  assert.ok(cpu && memory, `${kind} must include cpu and memory quantities`);
  return { cpu: cpu[1], memory: memory[1] };
}

export function parseCpuMillicores(value) {
  return value.endsWith("m")
    ? Number.parseFloat(value)
    : Number.parseFloat(value) * 1000;
}

export function parseMemoryMiB(value) {
  const match = value.match(/^([\d.]+)(Ki|Mi|Gi)?$/);
  assert.ok(match, `Unsupported Kubernetes memory quantity: ${value}`);
  const scales = { Ki: 1 / 1024, Mi: 1, Gi: 1024 };
  return Number(match[1]) * (scales[match[2]] ?? 1 / 1024 ** 2);
}

const requests = parseResourcePair("requests");
const limits = parseResourcePair("limits");
export const resourceBudget = {
  cpuRequestMillicores: parseCpuMillicores(requests.cpu),
  cpuLimitMillicores: parseCpuMillicores(limits.cpu),
  memoryRequestMiB: parseMemoryMiB(requests.memory),
  memoryLimitMiB: parseMemoryMiB(limits.memory),
};
assert.ok(
  resourceBudget.cpuRequestMillicores <= resourceBudget.cpuLimitMillicores,
);
assert.ok(resourceBudget.memoryRequestMiB <= resourceBudget.memoryLimitMiB);
assert.equal(limits.cpu, "500m", "Docker smoke CPU cap must match Helm limits");
assert.equal(
  limits.memory,
  "256Mi",
  "Docker smoke memory cap must match Helm limits",
);
const outputDirectory = mkdtempSync(
  join(process.env.RUNNER_TEMP ?? tmpdir(), "cgn-resource-capacity-"),
);
const duration = process.env.PROFILE_DURATION ?? "30s";
const targetRps = capacity.loadProfiles.baseline.targetRequestsPerSecond;
const samples = [];
let phase = "baseline";
let pendingStats = "";

function parseMiB(value) {
  const match = value.match(/^([\d.]+)\s*(B|kB|KB|KiB|MB|MiB|GB|GiB)$/i);
  if (!match) {
    return null;
  }

  const units = {
    b: 1 / 1024 ** 2,
    kb: 1000 / 1024 ** 2,
    kib: 1 / 1024,
    mb: 1000 ** 2 / 1024 ** 2,
    mib: 1,
    gb: 1000 ** 3 / 1024 ** 2,
    gib: 1024,
  };
  return Number(match[1]) * units[match[2].toLowerCase()];
}

function recordStatsLine(line) {
  const [cpu, memoryUsage] = line.trim().split("|");
  const memory = memoryUsage?.split("/")[0]?.trim();
  const cpuPercent = Number.parseFloat(cpu);
  const memoryMiB = memory ? parseMiB(memory) : null;
  if (Number.isFinite(cpuPercent) && Number.isFinite(memoryMiB)) {
    samples.push({ phase, cpuMillicores: cpuPercent * 10, memoryMiB });
  }
}

function flushPendingStats() {
  if (pendingStats.trim()) {
    recordStatsLine(pendingStats);
    pendingStats = "";
  }
}

function summaryFor(name) {
  return JSON.parse(
    readFileSync(join(outputDirectory, `${name}.json`), "utf8"),
  );
}

function runK6(name) {
  const result = spawnSync(
    "docker",
    [
      "run",
      "--rm",
      "--network",
      "host",
      "--user",
      dockerUser,
      "-e",
      `BASE_URL=${endpoint}`,
      "-e",
      `TARGET_RPS=${targetRps}`,
      "-e",
      `PROFILE_DURATION=${duration}`,
      "-v",
      `${repoRoot}:/work:ro`,
      "-v",
      `${outputDirectory}:/out`,
      "grafana/k6:0.54.0",
      "run",
      "--summary-export",
      `/out/${name}.json`,
      "/work/tests/performance/resource-capacity.js",
    ],
    { cwd: repoRoot, stdio: "inherit" },
  );

  if (result.error) {
    throw result.error;
  }
  assert.equal(result.status, 0, `k6 ${name} profile failed`);
  return summaryFor(name);
}

function phaseMetrics(name, summary) {
  const matching = samples.filter((sample) => sample.phase === name);
  assert.ok(matching.length > 0, `No Docker resource samples for ${name}`);
  return {
    requests: Math.round(summary.metrics.http_reqs.values.count),
    errorRatePercent: summary.metrics.http_req_failed.values.rate * 100,
    p95Ms: summary.metrics.http_req_duration.values["p(95)"],
    peakCpuMillicores: Math.max(
      ...matching.map((sample) => sample.cpuMillicores),
    ),
    peakMemoryMiB: Math.max(...matching.map((sample) => sample.memoryMiB)),
  };
}

async function stopStats(stats) {
  if (stats.exitCode !== null || stats.signalCode !== null) {
    return;
  }

  const closed = new Promise((resolveClose) => {
    stats.once("close", () => resolveClose(true));
  });
  stats.kill("SIGTERM");
  if (
    await Promise.race([
      closed,
      new Promise((resolveWait) => setTimeout(() => resolveWait(false), 2000)),
    ])
  ) {
    flushPendingStats();
    return;
  }

  const forceClosed = new Promise((resolveClose) => {
    stats.once("close", () => resolveClose(true));
  });
  stats.kill("SIGKILL");
  await Promise.race([
    forceClosed,
    new Promise((resolveWait) => setTimeout(resolveWait, 2000)),
  ]);
  flushPendingStats();
}

function formatPhase(name, metrics) {
  const cpuRequestPercent =
    (metrics.peakCpuMillicores / resourceBudget.cpuRequestMillicores) * 100;
  const cpuLimitHeadroomPercent = Math.max(
    0,
    (1 - metrics.peakCpuMillicores / resourceBudget.cpuLimitMillicores) * 100,
  );
  const memoryRequestPercent =
    (metrics.peakMemoryMiB / resourceBudget.memoryRequestMiB) * 100;
  const memoryLimitHeadroomPercent = Math.max(
    0,
    (1 - metrics.peakMemoryMiB / resourceBudget.memoryLimitMiB) * 100,
  );

  const cells = [
    name,
    metrics.requests,
    `${metrics.errorRatePercent.toFixed(3)}%`,
    metrics.p95Ms.toFixed(1),
    `${metrics.peakCpuMillicores.toFixed(1)}m (${cpuRequestPercent.toFixed(0)}% req)`,
    `${metrics.peakMemoryMiB.toFixed(1)} MiB (${memoryRequestPercent.toFixed(0)}% req)`,
    `${cpuLimitHeadroomPercent.toFixed(0)}%`,
    `${memoryLimitHeadroomPercent.toFixed(0)}%`,
  ];
  return `| ${cells.join(" | ")} |`;
}

function createDashboard(baseline, pressure) {
  return [
    "## CGN-90 health-demo resource capacity smoke",
    "",
    [
      `Shortened baseline: ${targetRps} requests/s for ${duration},`,
      "with a 100-VU pool configured against health-demo only.",
      "The pressure phase adds a resident 64 MiB allocation and CPU work",
      "in the disposable container. This is a staging resource-policy check;",
      "it does not simulate 5,000 registered users or prove product capacity.",
    ].join(" "),
    "",
    [
      `Policy applied: CPU request/limit ${resourceBudget.cpuRequestMillicores}m/`,
      `${resourceBudget.cpuLimitMillicores}m; memory request/limit`,
      `${resourceBudget.memoryRequestMiB}/${resourceBudget.memoryLimitMiB} MiB.`,
      `HPA thresholds remain ${capacity.resourceBudgets.cpuSustainedPercentScaleTrigger}% CPU and`,
      `${capacity.resourceBudgets.memorySustainedPercentScaleTrigger}% memory for`,
      `${capacity.resourceBudgets.observationWindowMinutes} minute windows; this short run`,
      "does not establish sustained scaling behavior.",
    ].join(" "),
    "",
    "| Phase | Requests | Error rate | p95 ms | Peak CPU (request use) | Peak memory (request use) | CPU limit headroom | Memory limit headroom |",
    "|---|---:|---:|---:|---:|---:|---:|---:|",
    formatPhase("baseline", baseline),
    formatPhase("cpu+memory pressure", pressure),
    "",
    [
      "CPU/memory usage and headroom are observed from Docker stats on this",
      "ephemeral CI runner. These measurements describe only this image and",
      "profile; recalibrate service production resources using representative",
      "service workloads and CGN-284 full load/soak evidence.",
    ].join(" "),
    "",
  ].join("\n");
}

async function main() {
  const stats = spawn("docker", [
    "stats",
    "--format",
    "{{.CPUPerc}}|{{.MemUsage}}",
    containerName,
  ]);
  stats.stdout.setEncoding("utf8");
  stats.stdout.on("data", (chunk) => {
    pendingStats += chunk;
    const lines = pendingStats.split(/[\r\n]+/);
    pendingStats = lines.pop() ?? "";
    for (const line of lines) {
      recordStatsLine(line);
    }
  });

  try {
    await new Promise((resolveSleep) => setTimeout(resolveSleep, 1500));
    const baselineSummary = runK6("baseline");
    phase = "pressure";
    execFileSync(
      "docker",
      ["exec", "-d", containerName, "node", "/tmp/resource-pressure.mjs"],
      { stdio: "inherit" },
    );
    await new Promise((resolveSleep) => setTimeout(resolveSleep, 1500));
    const pressureSummary = runK6("pressure");
    await stopStats(stats);

    const dashboard = createDashboard(
      phaseMetrics("baseline", baselineSummary),
      phaseMetrics("pressure", pressureSummary),
    );
    const dashboardPath = join(outputDirectory, "capacity-dashboard.md");
    writeFileSync(dashboardPath, dashboard, "utf8");
    console.log(dashboard);
    if (process.env.GITHUB_STEP_SUMMARY) {
      appendFileSync(process.env.GITHUB_STEP_SUMMARY, dashboard);
    }
    console.log(`Capacity dashboard: ${dashboardPath}`);
  } finally {
    await stopStats(stats);
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
