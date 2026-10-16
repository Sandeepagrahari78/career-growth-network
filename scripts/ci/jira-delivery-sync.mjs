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
    return pr.merged_by?.login === OWNER &&
      evidence.prCI &&
      evidence.mainCI &&
      evidence.accepted &&
      evidence.handoff
      ? "Done"
      : null;
  }
  return pr.state === "open" ? (pr.draft ? "In Progress" : "In Review") : null;
}

// Exact immutable merge SHA: owner attests technical review, all acceptance
// criteria and required staging after merge. Agents must never post this marker.
export function accepted(pr, comments) {
  if (!/^[a-f0-9]{40}$/.test(pr.merge_commit_sha ?? "")) {
    return false;
  }
  return comments.some(
    (c) =>
      c.user?.login === OWNER &&
      Date.parse(c.created_at) >= Date.parse(pr.merged_at) &&
      c.body
        ?.split(/\r?\n/)
        .some((line) => line.trim() === `CGN-ACCEPTED: ${pr.merge_commit_sha}`),
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
    const [comments, files, prCI, mainCI] = await Promise.all([
      list(api, `/issues/${number}/comments`),
      list(api, `/pulls/${number}/files`),
      ciPassed(api, "pr-ci.yml", pr.head.sha, "pull_request", pr.number),
      ciPassed(api, "main-ci.yml", pr.merge_commit_sha, "push"),
    ]);
    evidence = {
      prCI,
      mainCI,
      accepted: accepted(pr, comments),
      handoff: files.some(
        (f) =>
          f.filename === `docs/handoffs/${ticket}.md` && f.status !== "removed",
      ),
    };
  }
  const target = desiredStatus(pr, evidence);
  return target
    ? transition(api, ticket, target)
    : "Waiting for reviewed merge, CI and owner acceptance; Jira unchanged";
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
    const run = event.workflow_run;
    if (
      run.name !== "Main CI" ||
      run.head_branch !== "main" ||
      run.conclusion !== "success"
    ) {
      return "Waiting for successful Main CI";
    }
    const prs = await list(api, `/commits/${run.head_sha}/pulls`);
    const results = [];
    for (const pr of prs.filter(
      (p) => p.merged_at && p.merge_commit_sha === run.head_sha,
    )) {
      results.push(await syncPR(api, pr.number));
    }
    return results.join("\n") || "No merged ticket PR for this SHA";
  }
  if (env.GITHUB_EVENT_NAME === "issue_comment" && !event.issue?.pull_request) {
    return "Ignored non-PR comment";
  }
  return syncPR(
    api,
    event.pull_request?.number ??
      event.issue?.number ??
      event.inputs?.pr_number,
  );
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
