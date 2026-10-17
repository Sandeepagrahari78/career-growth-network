import { readFileSync } from "node:fs";
import { Buffer } from "node:buffer";
import { pathToFileURL } from "node:url";

export const REPO = "Sandeepagrahari78/career-growth-network";
const OWNER = "Sandeepagrahari78";
const JIRA = "https://sandeepagrahari1.atlassian.net";
const ranks = { "To Do": 0, "In Progress": 1, "In Review": 2, Done: 3 };

export function ticketFromBranch(branch = "") {
  return /^(CGN-[1-9][0-9]*)-[A-Za-z0-9._-]+$/.exec(branch)?.[1];
}

export function ticketFromBranchEvent(eventName, event = {}) {
  let branch = "";
  if (eventName === "create" && event.ref_type === "branch") {
    branch = event.ref;
  } else if (eventName === "push") {
    branch = /^refs\/heads\/(.+)$/.exec(event.ref ?? "")?.[1] ?? "";
  }
  return ticketFromBranch(branch);
}

export function desiredStatus(pr, evidence = {}) {
  if (pr.base?.ref !== "main" || pr.head?.repo?.full_name !== REPO) {
    return null;
  }
  if (!ticketFromBranch(pr.head.ref)) {
    return null;
  }
  if (pr.merged) {
    return /^[a-f0-9]{40}$/.test(pr.merge_commit_sha ?? "") &&
      pr.merged_by?.login === OWNER &&
      evidence.prCI &&
      evidence.mainCI &&
      evidence.staging &&
      evidence.handoff
      ? "Done"
      : null;
  }
  return pr.state === "open" ? (pr.draft ? "In Progress" : "In Review") : null;
}

// workflow_run.head_sha can describe the default branch rather than the tested
// candidate. The trusted staging workflow names every run with its resolved SHA.
export function stagingCandidate(run = {}) {
  if (
    run.name !== "Staging Validation" ||
    run.head_branch !== "main" ||
    !["workflow_run", "workflow_dispatch"].includes(run.event)
  ) {
    return null;
  }
  return (
    /^Staging Validation: ([a-f0-9]{40})$/.exec(run.display_title ?? "")?.[1] ??
    null
  );
}

export async function stagingPassed(api, sha) {
  const runs = await list(
    api,
    "/actions/workflows/staging.yml/runs",
    "workflow_runs",
  );
  const latest = runs
    .filter((r) => stagingCandidate(r) === sha)
    .sort((a, b) => b.id - a.id)[0];
  if (latest?.status !== "completed" || latest.conclusion !== "success") {
    return false;
  }
  // Read metadata only; never download or execute an artifact in this privileged job.
  const artifacts = await list(
    api,
    `/actions/runs/${latest.id}/artifacts`,
    "artifacts",
  );
  return artifacts.some(
    (a) => a.name === `staging-evidence-${sha}` && a.expired === false,
  );
}

export function apiClient(env, fetcher = globalThis.fetch) {
  for (const key of ["GITHUB_TOKEN", "CGN_JIRA_EMAIL", "CGN_JIRA_API_TOKEN"]) {
    if (!env[key]) {
      throw new Error(`Missing repository secret: ${key}`);
    }
  }
  return async (service, path, body) => {
    const github = service === "github";
    if (!path.startsWith("/") || path.includes("..") || path.includes("://")) {
      throw new Error("Invalid API path");
    }
    const base = github
      ? `https://api.github.com/repos/${REPO}`
      : `${JIRA}/rest/api/3`;
    const auth = github
      ? `Bearer ${env.GITHUB_TOKEN}`
      : `Basic ${Buffer.from(`${env.CGN_JIRA_EMAIL}:${env.CGN_JIRA_API_TOKEN}`).toString("base64")}`;
    let response;
    try {
      response = await fetcher(base + path, {
        method: body ? "POST" : "GET",
        redirect: "error",
        signal: globalThis.AbortSignal.timeout(20000),
        headers: {
          Authorization: auth,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
    } catch {
      throw new Error(
        `${service} request failed (network/timeout/redirect); rerun sync`,
      );
    }
    if (!response.ok) {
      // Never log headers, credentials or remote response bodies.
      throw new Error(
        `${service} HTTP ${response.status}; check permissions and rerun sync`,
      );
    }
    return response.status === 204 ? null : response.json();
  };
}

export async function list(api, path, key) {
  const all = [];
  for (let page = 1; page <= 50; page++) {
    const result = await api(
      "github",
      `${path}${path.includes("?") ? "&" : "?"}per_page=100&page=${page}`,
    );
    const rows = key ? result[key] : result;
    if (!Array.isArray(rows)) {
      throw new Error("Unexpected GitHub list response");
    }
    all.push(...rows);
    if (rows.length < 100) {
      return all;
    }
  }
  throw new Error(
    "GitHub pagination limit reached; manual investigation required",
  );
}

async function ciPassed(api, workflow, sha, event, number) {
  const runs = await list(
    api,
    `/actions/workflows/${workflow}/runs?head_sha=${sha}&event=${event}`,
    "workflow_runs",
  );
  const matching = runs
    .filter(
      (r) =>
        r.head_sha === sha &&
        r.event === event &&
        (!number || r.pull_requests?.some((p) => p.number === number)),
    )
    .sort((a, b) => b.id - a.id);
  // Latest run wins: an old successful run cannot mask a failed rerun.
  return (
    matching[0]?.status === "completed" && matching[0]?.conclusion === "success"
  );
}

export async function transition(api, ticket, target) {
  if (!/^CGN-[1-9][0-9]*$/.test(ticket) || !(target in ranks)) {
    throw new Error("Invalid Jira target");
  }
  const issue = await api(
    "jira",
    `/issue/${ticket}?fields=status,issuelinks,subtasks`,
  );
  const current = issue.fields.status.name;
  if (!(current in ranks)) {
    throw new Error("Unmapped Jira status; no automatic transition");
  }
  if (ranks[current] >= ranks[target]) {
    return "Already at or beyond requested status";
  }
  if (target === "Done") {
    const dependencies = [
      ...(issue.fields.subtasks ?? []),
      ...(issue.fields.issuelinks ?? [])
        .filter((l) => l.type?.inward?.toLowerCase() === "is blocked by")
        .map((l) => l.inwardIssue)
        .filter(Boolean),
    ];
    for (const dependency of dependencies) {
      if (!/^CGN-[1-9][0-9]*$/.test(dependency.key)) {
        throw new Error("Dependency outside CGN requires manual review");
      }
      const live = await api("jira", `/issue/${dependency.key}?fields=status`);
      if (live.fields.status.statusCategory?.key !== "done") {
        return "Waiting for Jira blockers/subtasks";
      }
    }
  }
  const available = await api("jira", `/issue/${ticket}/transitions`);
  const move = available.transitions.find((t) => t.to?.name === target);
  if (!move) {
    throw new Error(`No available Jira transition to ${target}`);
  }
  await api("jira", `/issue/${ticket}/transitions`, {
    transition: { id: move.id },
  });
  return `Transitioned ${ticket} to ${target}`;
}

export async function syncPR(api, number) {
  if (!/^[1-9][0-9]*$/.test(String(number))) {
    throw new Error("Invalid PR number");
  }
  const pr = await api("github", `/pulls/${number}`);
  const ticket = ticketFromBranch(pr.head?.ref);
  if (!ticket || pr.base?.ref !== "main" || pr.head?.repo?.full_name !== REPO) {
    return "Ignored out-of-scope PR";
  }
  let evidence = {};
  if (pr.merged) {
    const [files, prCI, mainCI, staging] = await Promise.all([
      list(api, `/pulls/${number}/files`),
      ciPassed(api, "pr-ci.yml", pr.head.sha, "pull_request", pr.number),
      ciPassed(api, "main-ci.yml", pr.merge_commit_sha, "push"),
      stagingPassed(api, pr.merge_commit_sha),
    ]);
    evidence = {
      prCI,
      mainCI,
      staging,
      handoff: files.some(
        (f) =>
          f.filename === `docs/handoffs/${ticket}.md` && f.status !== "removed",
      ),
    };
  }
  const target = desiredStatus(pr, evidence);
  return target
    ? transition(api, ticket, target)
    : "Waiting for owner merge, PR/Main CI and exact-candidate staging; Jira unchanged";
}

export async function syncWorkflowRun(api, run) {
  if (
    !["Main CI", "Staging Validation"].includes(run.name) ||
    run.head_branch !== "main" ||
    run.conclusion !== "success"
  ) {
    return "Waiting for successful Main CI or staging";
  }
  const candidate =
    run.name === "Staging Validation" ? stagingCandidate(run) : run.head_sha;
  if (!/^[a-f0-9]{40}$/.test(candidate ?? "")) {
    return "Ignored unknown candidate";
  }
  const prs = await list(api, `/commits/${candidate}/pulls`);
  const results = [];
  for (const pr of prs.filter(
    (p) => p.merged_at && p.merge_commit_sha === candidate,
  )) {
    results.push(await syncPR(api, pr.number));
  }
  return results.join("\n") || "No merged ticket PR for this SHA";
}

export async function run(env = process.env) {
  if (env.GITHUB_REPOSITORY !== REPO) {
    throw new Error("Unexpected repository");
  }
  const event = JSON.parse(readFileSync(env.GITHUB_EVENT_PATH, "utf8"));
  const api = apiClient(env);
  if (env.GITHUB_EVENT_NAME === "create" || env.GITHUB_EVENT_NAME === "push") {
    const ticket = ticketFromBranchEvent(env.GITHUB_EVENT_NAME, event);
    return ticket
      ? transition(api, ticket, "In Progress")
      : "Ignored non-ticket ref";
  }
  if (env.GITHUB_EVENT_NAME === "workflow_run") {
    return syncWorkflowRun(api, event.workflow_run);
  }

  return syncPR(api, event.pull_request?.number ?? event.inputs?.pr_number);
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  run()
    .then((result) => console.log(result))
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
}
