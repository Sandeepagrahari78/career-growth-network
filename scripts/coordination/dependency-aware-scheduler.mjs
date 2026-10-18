#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const JIRA = "https://sandeepagrahari1.atlassian.net/rest/api/3";
const GITHUB =
  "https://api.github.com/repos/Sandeepagrahari78/career-growth-network";
const OWNERS = ["Sandeep Agrahari", "Prachi Akhilesh Dubey", "Tanvi Ambre"];
const PAGE_SIZE = 100;
const MAX_PAGES = 50;
const STATUS_OPEN = new Set([
  "To Do",
  "Open",
  "Backlog",
  "Selected for Development",
]);
const STATUS_ACTIVE = new Set(["In Progress", "In Development"]);
const STATUS_REVIEW = new Set(["In Review", "Code Review", "QA", "Testing"]);

function issueRank(issue) {
  const raw =
    issue.rank ??
    issue.fields?.customFields?.Rank?.value ??
    issue.fields?.customfield_10019;
  return typeof raw === "string" ? raw : (raw?.value ?? null);
}

function descriptionText(value) {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object") return "";
  if (Array.isArray(value)) return value.map(descriptionText).join("\n");
  if (value.type === "text") return value.text ?? "";
  return (value.content ?? [])
    .map(descriptionText)
    .join(value.type === "paragraph" ? "" : "\n");
}

export function parseExecutionSequence(description) {
  const match = /Execution\s+sequence\s*:\s*(\d+)\s+of\s+(\d+)/i.exec(
    descriptionText(description),
  );
  return match ? { current: Number(match[1]), total: Number(match[2]) } : null;
}

function rankIsParseable(rank) {
  // Jira LexoRank commonly has a bucket, rank body, and optional suffix (e.g. 0|i0008e:zv).
  return (
    typeof rank === "string" &&
    /^\d+\|[A-Za-z0-9]+(?::[A-Za-z0-9]*)?$/.test(rank)
  );
}

function getIssueLink(link) {
  if ((link.type?.name ?? "").toLowerCase() !== "blocks") return null;
  if (link.inwardIssue)
    return { relation: "blockedBy", key: link.inwardIssue.key };
  if (link.outwardIssue)
    return { relation: "blocks", key: link.outwardIssue.key };
  return { relation: "missing", key: null };
}

function normalizeIssue(issue) {
  const f = issue.fields ?? issue;
  const links = f.issuelinks ?? issue.links ?? [];
  const normalizedLinks = (
    f.issuelinks
      ? links.map(getIssueLink).filter(Boolean)
      : links.map((link) => ({
          relation: link.relation,
          key: link.key ?? null,
        }))
  ).filter(
    (link) =>
      link.relation === "blockedBy" ||
      link.relation === "blocks" ||
      link.relation === "missing",
  );
  const type = f.issuetype?.name ?? issue.type ?? "Unknown";
  const resolution = (
    f.resolution?.name ??
    issue.resolution ??
    ""
  ).toLowerCase();
  const duplicate =
    resolution === "duplicate" ||
    (f.labels ?? issue.labels ?? []).some(
      (label) => String(label).toLowerCase() === "duplicate",
    ) ||
    (f.issuelinks ?? issue.links ?? []).some(
      (link) =>
        (link.type?.name ?? "").toLowerCase() === "duplicate" ||
        (link.type?.name ?? "").toLowerCase() === "duplicates",
    );
  const rank = issueRank(issue);
  const description = descriptionText(f.description ?? issue.description);
  const hardPrerequisites = issue.hardPrerequisites ?? [
    ...new Set(
      [
        ...description.matchAll(
          /(?:Hard prerequisites|Blocked by)\s*:\s*([^\n]+)/gi,
        ),
      ].flatMap((match) =>
        [...match[1].matchAll(/CGN-\d+/gi)].map((item) =>
          item[0].toUpperCase(),
        ),
      ),
    ),
  ];
  const linkedPrerequisites = normalizedLinks
    .filter((link) => link.relation === "blockedBy" && link.key)
    .map((link) => link.key.toUpperCase());
  const prerequisiteConflict =
    hardPrerequisites.length &&
    (hardPrerequisites.some((key) => !linkedPrerequisites.includes(key)) ||
      linkedPrerequisites.some((key) => !hardPrerequisites.includes(key)))
      ? `Ticket description lists [${hardPrerequisites.join(", ")}] as hard prerequisites, while Jira Blocks links list [${linkedPrerequisites.join(", ") || "none"}].`
      : null;
  return {
    key: issue.key,
    summary: f.summary ?? issue.summary ?? "(no summary)",
    status: f.status?.name ?? issue.status ?? "Unknown",
    statusCategory:
      f.status?.statusCategory?.key ?? issue.statusCategory ?? null,
    owner: f.assignee?.displayName ?? issue.owner ?? null,
    ownerId: f.assignee?.accountId ?? issue.ownerId ?? null,
    rank,
    executionSequence:
      issue.executionSequence ?? parseExecutionSequence(description),
    type,
    resolution: f.resolution?.name ?? issue.resolution ?? null,
    duplicate,
    links: normalizedLinks,
    hardPrerequisites,
    prerequisiteConflict,
    branch: issue.branch ?? null,
  };
}

function compareRank(a, b) {
  if (
    a.executionSequence &&
    b.executionSequence &&
    a.executionSequence.current !== b.executionSequence.current
  ) {
    return a.executionSequence.current - b.executionSequence.current;
  }
  if (a.executionSequence && !b.executionSequence) return -1;
  if (!a.executionSequence && b.executionSequence) return 1;
  return (
    String(a.rank ?? "\uffff").localeCompare(
      String(b.rank ?? "\uffff"),
      "en",
    ) || a.key.localeCompare(b.key, "en")
  );
}

function isDone(issue) {
  return (
    issue.statusCategory === "done" ||
    issue.status.toLowerCase() === "done" ||
    issue.status.toLowerCase() === "closed" ||
    issue.status.toLowerCase() === "resolved"
  );
}

function statusReason(issue) {
  if (!issue) return "Jira issue is missing from the complete snapshot.";
  if (issue.type.toLowerCase() === "epic")
    return "Predecessor is an Epic and is not executable work.";
  if (issue.duplicate) return "Jira marks this issue as a duplicate.";
  if (!isDone(issue))
    return `Predecessor is ${issue.status}${issue.owner ? ` (assigned to ${issue.owner})` : " (unassigned)"}, not Done.`;
  return null;
}

function evidenceReason(issue, evidence) {
  if (!isDone(issue)) return null;
  const proof = evidence?.[issue.key];
  if (!proof || proof.verified !== true) {
    const missing = [
      "merged PR",
      "handoff",
      "PR CI",
      "Main CI",
      "staging",
    ].filter((field) => proof?.[field] !== true);
    return `Jira is Done, but GitHub completion evidence is unverified${missing.length ? `: missing ${missing.join(", ")}` : ""}.`;
  }
  return null;
}

function collectUpstream(
  key,
  byKey,
  evidence,
  stack = new Set(),
  memo = new Map(),
) {
  if (memo.has(key)) return memo.get(key);
  if (stack.has(key))
    return {
      upstream: [],
      reasons: [`Dependency cycle detected at ${key}.`],
      cycle: true,
    };
  const issue = byKey.get(key);
  if (!issue)
    return {
      upstream: [],
      reasons: [`Missing Jira predecessor ${key}.`],
      cycle: false,
    };
  const nextStack = new Set(stack).add(key);
  const deps = issue.links.filter(
    (link) => link.relation === "blockedBy" || link.relation === "missing",
  );
  const result = { upstream: [], reasons: [], cycle: false };
  if (issue.prerequisiteConflict)
    result.reasons.push(
      `${key}: conflicting prerequisites. ${issue.prerequisiteConflict}`,
    );
  for (const link of deps) {
    if (!link.key) {
      result.reasons.push(`${key} has a Blocks link with no returned target.`);
      continue;
    }
    const predecessor = byKey.get(link.key);
    result.upstream.push(link.key);
    if (predecessor) {
      const reason =
        statusReason(predecessor) ?? evidenceReason(predecessor, evidence);
      if (reason) result.reasons.push(`${predecessor.key}: ${reason}`);
      const transitive = collectUpstream(
        predecessor.key,
        byKey,
        evidence,
        nextStack,
        memo,
      );
      result.upstream.push(...transitive.upstream);
      result.reasons.push(...transitive.reasons);
      result.cycle ||= transitive.cycle;
    } else {
      result.reasons.push(`Missing Jira predecessor ${link.key}.`);
    }
  }
  result.upstream = [...new Set(result.upstream)].sort((a, b) =>
    compareRank(byKey.get(a) ?? { key: a }, byKey.get(b) ?? { key: b }),
  );
  result.reasons = [...new Set(result.reasons)];
  memo.set(key, result);
  return result;
}

function hasCycle(byKey) {
  const visiting = new Set();
  const visited = new Set();
  function visit(key) {
    if (visiting.has(key)) return true;
    if (visited.has(key)) return false;
    visiting.add(key);
    const issue = byKey.get(key);
    for (const link of issue?.links ?? []) {
      if (
        link.relation === "blockedBy" &&
        byKey.has(link.key) &&
        visit(link.key)
      )
        return true;
    }
    visiting.delete(key);
    visited.add(key);
    return false;
  }
  for (const key of byKey.keys()) if (visit(key)) return true;
  return false;
}

function ticketFromBranch(branch) {
  return /^CGN-\d+(?:-|$)/i.test(branch ?? "")
    ? branch.match(/^CGN-\d+/i)[0].toUpperCase()
    : null;
}

function issueStatusForQueue(issue) {
  const s = issue.status.toLowerCase();
  if (
    STATUS_ACTIVE.has(issue.status) ||
    s === "in progress" ||
    s === "in development"
  )
    return "CURRENT";
  if (STATUS_REVIEW.has(issue.status) || s === "in review")
    return "WAITING_FOR_REVIEW";
  return null;
}

function descendantsOf(key, byKey) {
  const seen = new Set();
  const queue = [key];
  while (queue.length) {
    const current = queue.shift();
    for (const candidate of byKey.values()) {
      if (
        candidate.links.some(
          (l) => l.relation === "blockedBy" && l.key === current,
        ) &&
        !seen.has(candidate.key)
      ) {
        seen.add(candidate.key);
        queue.push(candidate.key);
      }
    }
  }
  return [...seen]
    .map((childKey) => byKey.get(childKey))
    .filter(
      (issue) =>
        issue &&
        !isDone(issue) &&
        !issue.duplicate &&
        issue.type.toLowerCase() !== "epic",
    );
}

function recommendationScore(issue, byKey, evidence) {
  const downstream = descendantsOf(issue.key, byKey).filter(
    (child) => child.owner && child.owner !== issue.owner,
  );
  const firstSeq = Math.min(
    ...downstream.map(
      (child) => child.executionSequence?.current ?? Number.MAX_SAFE_INTEGER,
    ),
  );
  return {
    unlocks: downstream.length,
    firstDownstreamSequence: Number.isFinite(firstSeq) ? firstSeq : null,
  };
}

function decorate(issue, decision, reasons, upstream, byKey, evidence) {
  const score =
    decision === "NEXT_READY" || decision === "UPCOMING"
      ? recommendationScore(issue, byKey, evidence)
      : { unlocks: 0, firstDownstreamSequence: null };
  const suggestedPriority = score.unlocks
    ? "UPSTREAM_ENABLER"
    : decision === "CURRENT"
      ? "IN_PROGRESS"
      : decision === "WAITING_FOR_REVIEW"
        ? "REVIEW_GATE"
        : decision === "BLOCKED"
          ? "BLOCKED"
          : "RANK_ORDER";
  return {
    key: issue.key,
    summary: issue.summary,
    status: issue.status,
    assignedOwner: issue.owner,
    rank: issue.rank,
    executionSequence: issue.executionSequence,
    dependencyChain: upstream.map((key) => {
      const predecessor = byKey.get(key);
      return {
        key,
        owner: predecessor?.owner ?? null,
        status: predecessor?.status ?? "MISSING",
        reason: predecessor
          ? (statusReason(predecessor) ??
            evidenceReason(predecessor, evidence) ??
            "Jira Done and completion evidence verified.")
          : "Missing from Jira snapshot.",
      };
    }),
    decision,
    rationale: reasons.length
      ? reasons.join(" ")
      : decision === "NEXT_READY"
        ? "All linked predecessors are Done with verified evidence; selected by cross-team unlock value and then Jira Rank."
        : decision === "CURRENT"
          ? "Preserved because this ticket is already in progress; recommendations do not interrupt it."
          : "Eligible in the owner's queue after higher-priority recommendations.",
    suggestedPriority,
    crossTeamTicketsUnlocked: score.unlocks,
    recommendedNextTicket: decision === "NEXT_READY" ? issue.key : null,
  };
}

export function buildSchedule(
  snapshot,
  { now = new Date().toISOString() } = {},
) {
  const rawIssues = Array.isArray(snapshot) ? snapshot : snapshot.issues;
  if (!Array.isArray(rawIssues) || rawIssues.length === 0)
    throw new Error("Jira snapshot is empty or missing issues.");
  const partial =
    !Array.isArray(snapshot) &&
    (snapshot.complete !== true || snapshot.total !== rawIssues.length);
  const seen = new Set();
  const issues = rawIssues.map(normalizeIssue);
  for (const issue of issues) {
    if (!issue.key || seen.has(issue.key))
      throw new Error(
        `Incomplete Jira snapshot: missing or duplicate issue key ${issue.key ?? "(empty)"}.`,
      );
    seen.add(issue.key);
  }
  const byKey = new Map(issues.map((issue) => [issue.key, issue]));
  const evidence =
    (!Array.isArray(snapshot) && snapshot.completionEvidence) || {};
  const globalCycle = hasCycle(byKey);
  const prByTicket = new Map();
  const pullRequests =
    (!Array.isArray(snapshot) && snapshot.pullRequests) || [];
  for (const pr of pullRequests) {
    const key = pr.ticket ?? ticketFromBranch(pr.branch ?? pr.head?.ref);
    if (key) {
      const previous = prByTicket.get(key);
      if (
        !previous ||
        (pr.state === "open" && previous.state !== "open") ||
        (pr.state === previous.state &&
          new Date(pr.updatedAt ?? 0) > new Date(previous.updatedAt ?? 0))
      )
        prByTicket.set(key, pr);
    }
  }
  const runnable = issues.filter(
    (issue) =>
      !issue.duplicate &&
      issue.type.toLowerCase() !== "epic" &&
      !["sub-task", "subtask"].includes(issue.type.toLowerCase()) &&
      !isDone(issue) &&
      OWNERS.includes(issue.owner),
  );
  const lanes = {};
  for (const owner of OWNERS) {
    const own = runnable
      .filter((issue) => issue.owner === owner)
      .sort(compareRank);
    const currentIssues = own.filter(
      (issue) =>
        issueStatusForQueue(issue) === "CURRENT" &&
        !(
          prByTicket.get(issue.key)?.state === "open" &&
          !prByTicket.get(issue.key)?.draft
        ),
    );
    const reviewIssues = own.filter(
      (issue) =>
        issueStatusForQueue(issue) === "WAITING_FOR_REVIEW" &&
        !prByTicket.get(issue.key)?.draft,
    );
    const openPRIssues = own.filter((issue) => {
      const pr = prByTicket.get(issue.key);
      return (
        pr &&
        pr.state === "open" &&
        !reviewIssues.some((candidate) => candidate.key === issue.key)
      );
    });
    const draftPRIssues = openPRIssues.filter(
      (issue) => prByTicket.get(issue.key)?.draft,
    );
    const currentWithPR = [
      ...new Map(
        [...currentIssues, ...draftPRIssues].map((issue) => [issue.key, issue]),
      ).values(),
    ];
    const waitingPRIssues = openPRIssues.filter(
      (issue) => !prByTicket.get(issue.key)?.draft,
    );
    const alreadyActive = new Set(
      [...currentWithPR, ...reviewIssues, ...openPRIssues].map(
        (issue) => issue.key,
      ),
    );
    const ready = [];
    const blocked = [];
    for (const issue of own.filter(
      (candidate) => !alreadyActive.has(candidate.key),
    )) {
      const chain = collectUpstream(issue.key, byKey, evidence);
      const reasons = [...chain.reasons];
      if (!STATUS_OPEN.has(issue.status) && issue.statusCategory !== "new") {
        reasons.push(
          `Jira status ${issue.status} is not a recognized ready-to-start state.`,
        );
      }
      if (partial)
        reasons.unshift(
          "Jira result is partial or total changed during pagination; recommendations fail closed.",
        );
      if (!issue.owner) reasons.push("No Jira assignee is set.");
      if (!rankIsParseable(issue.rank))
        reasons.push(
          `Jira Rank is missing or malformed (${issue.rank ?? "missing"}).`,
        );
      if (chain.cycle || globalCycle)
        reasons.push(
          "Dependency graph contains a cycle; all readiness decisions fail closed.",
        );
      if (reasons.length)
        blocked.push(
          decorate(issue, "BLOCKED", reasons, chain.upstream, byKey, evidence),
        );
      else ready.push({ issue, chain });
    }
    ready.sort((a, b) => {
      const as = recommendationScore(a.issue, byKey, evidence),
        bs = recommendationScore(b.issue, byKey, evidence);
      return (
        bs.unlocks - as.unlocks ||
        (as.firstDownstreamSequence ?? Number.MAX_SAFE_INTEGER) -
          (bs.firstDownstreamSequence ?? Number.MAX_SAFE_INTEGER) ||
        compareRank(a.issue, b.issue)
      );
    });
    const nextReady = ready[0]
      ? decorate(
          ready[0].issue,
          "NEXT_READY",
          [],
          ready[0].chain.upstream,
          byKey,
          evidence,
        )
      : null;
    const upcoming = ready
      .slice(1, 4)
      .map(({ issue, chain }) =>
        decorate(issue, "UPCOMING", [], chain.upstream, byKey, evidence),
      );
    const current = currentWithPR.map((issue) =>
      decorate(
        issue,
        "CURRENT",
        [
          prByTicket.get(issue.key)?.draft
            ? `Preserved because draft GitHub PR #${prByTicket.get(issue.key).number} indicates work in progress; no pre-emption.`
            : "Preserved because Jira currently marks this ticket In Progress; no pre-emption.",
        ],
        collectUpstream(issue.key, byKey, evidence).upstream,
        byKey,
        evidence,
      ),
    );
    const waitingForReview = [...reviewIssues, ...waitingPRIssues].map(
      (issue) => {
        const pr = prByTicket.get(issue.key);
        const reason = pr
          ? `Open GitHub PR #${pr.number ?? "?"}${pr.draft ? " is draft" : ""}; waiting for review/merge.`
          : `Jira status is ${issue.status}; waiting for review to finish.`;
        return decorate(
          issue,
          "WAITING_FOR_REVIEW",
          [reason],
          collectUpstream(issue.key, byKey, evidence).upstream,
          byKey,
          evidence,
        );
      },
    );
    const waiting =
      !nextReady && !waitingForReview.length
        ? blocked.map((entry) => ({
            ...entry,
            decision: "WAITING",
            rationale: `No ready task for ${owner}. ${entry.rationale}`,
          }))
        : [];
    lanes[owner] = {
      owner,
      current,
      nextReady,
      upcoming,
      blocked,
      waitingForReview,
      waiting,
      recommendation: nextReady?.key ?? null,
    };
  }
  const diagnostics = {
    totalIssues: issues.length,
    runnableIssues: runnable.length,
    doneIssues: issues.filter(isDone).length,
    excludedDuplicates: issues
      .filter((issue) => issue.duplicate)
      .map((issue) => issue.key),
    unassignedActionable: issues
      .filter(
        (issue) =>
          !isDone(issue) &&
          !issue.duplicate &&
          issue.type.toLowerCase() !== "epic" &&
          !issue.owner,
      )
      .map((issue) => issue.key),
    unassignedTickets: issues
      .filter(
        (issue) =>
          !isDone(issue) &&
          !issue.duplicate &&
          issue.type.toLowerCase() !== "epic" &&
          !issue.owner,
      )
      .map((issue) => ({
        key: issue.key,
        summary: issue.summary,
        status: issue.status,
        rank: issue.rank,
        reason:
          "No Jira assignee is set; the scheduler never reassigns tickets.",
      })),
    unknownOwners: [
      ...new Set(
        issues
          .filter(
            (issue) =>
              !isDone(issue) && issue.owner && !OWNERS.includes(issue.owner),
          )
          .map((issue) => issue.owner),
      ),
    ],
    cycleDetected: globalCycle,
    brokenDependencyLinks: issues.flatMap((issue) =>
      issue.links
        .filter(
          (link) =>
            link.relation === "missing" || (link.key && !byKey.has(link.key)),
        )
        .map((link) => ({
          issue: issue.key,
          relation: link.relation,
          target: link.key ?? null,
          reason:
            "Blocks link target is absent or malformed in the complete Jira snapshot.",
        })),
    ),
    prerequisiteConflicts: issues
      .filter((issue) => issue.prerequisiteConflict)
      .map((issue) => ({
        issue: issue.key,
        reason: issue.prerequisiteConflict,
      })),
    partialSnapshot: partial,
  };
  const laneDecisions = new Map();
  for (const lane of Object.values(lanes)) {
    for (const ticket of [
      ...lane.current,
      ...(lane.nextReady ? [lane.nextReady] : []),
      ...lane.upcoming,
      ...lane.blocked,
      ...lane.waitingForReview,
      ...lane.waiting,
    ])
      laneDecisions.set(ticket.key, ticket);
  }
  const issueIndex = [...issues].sort(compareRank).map((issue) => {
    const queued = laneDecisions.get(issue.key);
    const chain = collectUpstream(issue.key, byKey, evidence);
    let decision = queued?.decision ?? null;
    if (!decision) {
      if (isDone(issue)) decision = "DONE";
      else if (issue.duplicate) decision = "EXCLUDED_DUPLICATE";
      else if (issue.type.toLowerCase() === "epic") decision = "EXCLUDED_EPIC";
      else if (["sub-task", "subtask"].includes(issue.type.toLowerCase()))
        decision = "EXCLUDED_SUBTASK";
      else if (!issue.owner) decision = "UNASSIGNED";
      else if (!OWNERS.includes(issue.owner)) decision = "OWNER_NOT_CONFIGURED";
      else decision = "EXCLUDED";
    }
    return {
      key: issue.key,
      summary: issue.summary,
      status: issue.status,
      assignedOwner: issue.owner,
      issueType: issue.type,
      rank: issue.rank,
      rankParseable: rankIsParseable(issue.rank),
      executionSequence: issue.executionSequence,
      dependencies: issue.links.map((link) => ({
        direction: link.relation,
        key: link.key,
      })),
      directAndTransitiveUpstream: chain.upstream,
      decision,
      rationale:
        queued?.rationale ??
        (chain.reasons.length ? chain.reasons.join(" ") : decision),
    };
  });
  return {
    generatedAt: now,
    mode:
      !Array.isArray(snapshot) && snapshot.mode ? snapshot.mode : "snapshot",
    jiraFreshness: !Array.isArray(snapshot)
      ? (snapshot.fetchedAt ?? null)
      : null,
    suggestedPriorityIsSeparateFromJiraRank: true,
    lanes,
    issueIndex,
    diagnostics,
  };
}

async function readJira(email, token, fetcher = fetch) {
  if (!email || !token)
    throw new Error(
      "Live Jira requires CGN_JIRA_EMAIL and CGN_JIRA_API_TOKEN; no credentials were found in this shell.",
    );
  const issues = [];
  let startAt = 0;
  let total = null;
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const params = new URLSearchParams({
      jql: "project = CGN ORDER BY Rank ASC",
      startAt: String(startAt),
      maxResults: String(PAGE_SIZE),
      fields:
        "summary,description,status,issuetype,assignee,priority,issuelinks,resolution,parent,customfield_10019",
    });
    const response = await fetcher(`${JIRA}/search?${params}`, {
      method: "GET",
      redirect: "error",
      signal: AbortSignal.timeout(20000),
      headers: {
        Authorization: `Basic ${Buffer.from(`${email}:${token}`).toString("base64")}`,
        Accept: "application/json",
      },
    });
    if (!response.ok)
      throw new Error(
        `Jira read failed (HTTP ${response.status}); credentials and issue access were not verified.`,
      );
    const data = await response.json();
    if (!Array.isArray(data.issues) || !Number.isInteger(data.total))
      throw new Error(
        "Jira returned an incomplete search page; no schedule produced.",
      );
    if (total !== null && total !== data.total)
      throw new Error(
        "Jira issue total changed during pagination; rerun against a fresh snapshot.",
      );
    total = data.total;
    issues.push(...data.issues);
    if (issues.length >= total) {
      if (issues.length !== total)
        throw new Error(
          "Jira returned duplicate or excess rows during pagination.",
        );
      return {
        issues,
        total,
        complete: true,
        fetchedAt: new Date().toISOString(),
        mode: "live-jira",
      };
    }
    if (data.issues.length === 0)
      throw new Error(
        "Jira pagination ended before the reported total; no schedule produced.",
      );
    startAt += data.issues.length;
  }
  throw new Error("Jira pagination limit reached; no schedule produced.");
}

async function readPullRequests(token, fetcher = fetch) {
  if (!token)
    return {
      pullRequests: [],
      completionEvidence: {},
      warning:
        "GitHub token missing; open PR and completion evidence are not verified.",
    };
  const pullRequests = [];
  for (let page = 1; page <= 10; page += 1) {
    const response = await fetcher(
      `${GITHUB}/pulls?state=all&per_page=100&page=${page}`,
      {
        method: "GET",
        redirect: "error",
        signal: AbortSignal.timeout(20000),
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      },
    );
    if (!response.ok)
      throw new Error(
        `GitHub read failed (HTTP ${response.status}); no PR state verified.`,
      );
    const rows = await response.json();
    if (!Array.isArray(rows))
      throw new Error("GitHub returned an incomplete open-PR page.");
    pullRequests.push(
      ...rows.map((pr) => ({
        number: pr.number,
        state: pr.state,
        draft: pr.draft,
        branch: pr.head?.ref,
        url: pr.html_url,
        updatedAt: pr.updated_at,
        merged: Boolean(pr.merged_at),
        mergedBy: pr.merged_by?.login ?? null,
        mergeSha: pr.merge_commit_sha,
        headSha: pr.head?.sha,
        base: pr.base?.ref,
      })),
    );
    if (rows.length < 100) break;
    if (page === 10)
      throw new Error(
        "GitHub PR pagination limit reached; no PR state verified.",
      );
  }
  return { pullRequests, warning: null };
}

async function readDependencyEvidence(
  token,
  pullRequests,
  issues,
  fetcher = fetch,
) {
  // These arguments are populated by the caller after Jira pagination. Keeping all network
  // evidence reads in this helper makes the Jira-only mode fail closed when it is unavailable.
  const result = {};
  const mergedByTicket = new Map();
  for (const pr of pullRequests) {
    const ticket = ticketFromBranch(pr.branch);
    if (
      ticket &&
      pr.merged &&
      pr.base === "main" &&
      pr.mergedBy === "Sandeepagrahari78"
    ) {
      const previous = mergedByTicket.get(ticket);
      if (
        !previous ||
        new Date(pr.updatedAt ?? 0) > new Date(previous.updatedAt ?? 0)
      )
        mergedByTicket.set(ticket, pr);
    }
  }
  const byKey = new Map(issues.map((issue) => [issue.key, issue]));
  const required = new Set();
  const pending = issues
    .filter(
      (issue) =>
        !isDone(issue) &&
        !issue.duplicate &&
        issue.type.toLowerCase() !== "epic",
    )
    .flatMap((issue) =>
      issue.links
        .filter((link) => link.relation === "blockedBy")
        .map((link) => link.key)
        .filter(Boolean),
    );
  while (pending.length) {
    const key = pending.pop();
    const predecessor = byKey.get(key);
    if (!predecessor || required.has(key) || !isDone(predecessor)) continue;
    required.add(key);
    for (const link of predecessor.links)
      if (link.relation === "blockedBy" && link.key) pending.push(link.key);
  }
  async function api(path) {
    const response = await fetcher(`${GITHUB}${path}`, {
      method: "GET",
      redirect: "error",
      signal: AbortSignal.timeout(20000),
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });
    if (!response.ok) return null;
    return response.json();
  }
  for (const key of required) {
    const pr = mergedByTicket.get(key);
    if (!pr) {
      result[key] = { verified: false };
      continue;
    }
    const [
      filesResponse,
      prRunsResponse,
      mainRunsResponse,
      stagingRunsResponse,
    ] = await Promise.all([
      api(`/pulls/${pr.number}/files?per_page=100`),
      api(
        `/actions/workflows/pr-ci.yml/runs?head_sha=${pr.headSha}&event=pull_request&per_page=100`,
      ),
      api(
        `/actions/workflows/main-ci.yml/runs?head_sha=${pr.mergeSha}&event=push&per_page=100`,
      ),
      api(`/actions/workflows/staging.yml/runs?per_page=100`),
    ]);
    const files = Array.isArray(filesResponse) ? filesResponse : [];
    const latestSuccessful = (
      response,
      sha,
      event,
      branch,
      prNumber = null,
    ) => {
      const latest = (response?.workflow_runs ?? [])
        .filter(
          (run) =>
            (run.head_sha === sha &&
              run.event === event &&
              (!branch || run.head_branch === branch) &&
              prNumber === null) ||
            !(run.pull_requests ?? []).length ||
            run.pull_requests.some((linked) => linked.number === prNumber),
        )
        .sort((a, b) => b.id - a.id)[0];
      return latest?.status === "completed" && latest.conclusion === "success";
    };
    const prCI = latestSuccessful(
      prRunsResponse,
      pr.headSha,
      "pull_request",
      pr.branch,
      pr.number,
    );
    const mainCI = latestSuccessful(
      mainRunsResponse,
      pr.mergeSha,
      "push",
      "main",
    );
    const latestStaging = (stagingRunsResponse?.workflow_runs ?? [])
      .filter(
        (run) =>
          run.head_branch === "main" &&
          run.path === ".github/workflows/staging.yml" &&
          run.display_title === `Staging Validation: ${pr.mergeSha}`,
      )
      .sort((a, b) => b.id - a.id)[0];
    const artifactsResponse =
      latestStaging?.status === "completed" &&
      latestStaging.conclusion === "success"
        ? await api(`/actions/runs/${latestStaging.id}/artifacts?per_page=100`)
        : null;
    const staging = Boolean(
      (artifactsResponse?.artifacts ?? []).some(
        (artifact) =>
          artifact.name === `staging-evidence-${pr.mergeSha}` &&
          artifact.expired === false,
      ),
    );
    const handoff = files.some(
      (file) =>
        file.filename === `docs/handoffs/${key}.md` &&
        file.status !== "removed",
    );
    const verified = pr.merged && handoff && prCI && mainCI && staging;
    result[key] = {
      verified,
      "merged PR": Boolean(pr.merged),
      handoff,
      "PR CI": prCI,
      "Main CI": mainCI,
      staging,
    };
  }
  return result;
}

function renderTable(schedule) {
  const lines = [
    `CGN dependency scheduler | snapshot: ${schedule.jiraFreshness ?? schedule.generatedAt}`,
    "Suggested priority is separate from actual Jira Rank. Read-only; no Jira/GitHub changes are made.",
  ];
  for (const owner of OWNERS) {
    const lane = schedule.lanes[owner];
    lines.push("", `${owner}`);
    const add = (label, ticket) => {
      if (!ticket) return;
      const sequence = ticket.executionSequence
        ? `seq ${String(ticket.executionSequence.current).padStart(3, "0")}`
        : `Rank ${ticket.rank ?? "missing"}`;
      lines.push(
        `  ${label.padEnd(18)} ${ticket.key} [${sequence}] ${ticket.suggestedPriority} — ${ticket.summary}`,
      );
      if (ticket.rationale) lines.push(`    Reason: ${ticket.rationale}`);
      for (const dep of ticket.dependencyChain)
        lines.push(
          `    Upstream: ${dep.key} (${dep.owner ?? "unassigned"}, ${dep.status}) — ${dep.reason}`,
        );
    };
    lane.current.forEach((ticket) => add("CURRENT", ticket));
    add("NEXT_READY", lane.nextReady);
    lane.upcoming.forEach((ticket) => add("UPCOMING", ticket));
    lane.waitingForReview.forEach((ticket) =>
      add("WAITING_FOR_REVIEW", ticket),
    );
    lane.blocked.slice(0, 3).forEach((ticket) => add("BLOCKED", ticket));
    if (lane.waiting.length)
      lane.waiting.slice(0, 3).forEach((ticket) => add("WAITING", ticket));
    if (
      !lane.current.length &&
      !lane.nextReady &&
      !lane.waitingForReview.length
    )
      lines.push("  WAITING            No ready ticket; see blockers above.");
  }
  lines.push(
    "",
    `Tickets: ${schedule.diagnostics.totalIssues}; runnable assigned: ${schedule.diagnostics.runnableIssues}; Jira Done: ${schedule.diagnostics.doneIssues}; unassigned: ${schedule.diagnostics.unassignedActionable.length}; cycles: ${schedule.diagnostics.cycleDetected ? "yes" : "no"}.`,
  );
  return lines.join("\n");
}

async function main(
  args = process.argv.slice(2),
  env = process.env,
  fetcher = fetch,
) {
  let inputPath = null;
  let json = false;
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === "--input") inputPath = args[++i];
    else if (args[i] === "--json") json = true;
    else if (args[i] === "--help" || args[i] === "-h") {
      console.log(
        "Usage: pnpm recommend:next [--input snapshot.json] [--json]\nDefault mode reads a complete Jira snapshot using local CGN_JIRA_* credentials and open PRs with GITHUB_TOKEN/GH_TOKEN.",
      );
      return;
    } else throw new Error(`Unknown option: ${args[i]}`);
  }
  let snapshot;
  let warnings = [];
  if (inputPath)
    snapshot = JSON.parse(
      (await readFile(inputPath, "utf8")).replace(/^\uFEFF/, ""),
    );
  else {
    snapshot = await readJira(
      env.CGN_JIRA_EMAIL,
      env.CGN_JIRA_API_TOKEN,
      fetcher,
    );
    const gh = await readPullRequests(
      env.GITHUB_TOKEN ?? env.GH_TOKEN,
      fetcher,
    );
    snapshot.pullRequests = gh.pullRequests;
    if (gh.warning) warnings.push(gh.warning);
    if (env.GITHUB_TOKEN || env.GH_TOKEN) {
      snapshot.completionEvidence = await readDependencyEvidence(
        env.GITHUB_TOKEN ?? env.GH_TOKEN,
        gh.pullRequests,
        snapshot.issues.map(normalizeIssue),
        fetcher,
      );
    }
  }
  const schedule = buildSchedule(snapshot);
  if (json) console.log(JSON.stringify({ ...schedule, warnings }, null, 2));
  else {
    console.log(renderTable(schedule));
    if (warnings.length) console.log(`\nWARNING: ${warnings.join(" ")}`);
    console.log("\nFor machine-readable output, add --json.");
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
