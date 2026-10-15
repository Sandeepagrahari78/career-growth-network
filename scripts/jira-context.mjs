// Optional read-only Jira issue loader. Never persist or log credentials.
// Jira connector credentials inside ChatGPT are NOT exported to this script.
const approvedSite = "sandeepagrahari1.atlassian.net";

function flattenAdf(node) {
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(flattenAdf).join("\n");
  if (!node || typeof node !== "object") return "";
  if (node.type === "text") return node.text || "";
  const parts = (node.content || []).map(flattenAdf);
  return parts.join(node.type === "paragraph" ? "" : "\n");
}

export function renderJiraIssue(issue, ticket) {
  if (!issue || issue.key !== ticket || !issue.fields) {
    throw new Error("Jira response ticket mismatch or missing issue fields.");
  }
  const fields = issue.fields;
  const links = (fields.issuelinks || []).flatMap((link) => {
    const rel = link.inwardIssue
      ? link.type?.inward || "linked to"
      : link.type?.outward || "linked to";
    const other = link.inwardIssue || link.outwardIssue;
    return other?.key ? ["- " + rel + ": " + other.key] : [];
  });
  const description = flattenAdf(fields.description).trim().slice(0, 28000);
  return [
    "## LIVE JIRA ISSUE — read-only snapshot",
    "",
    "- Ticket: " + ticket,
    "- Title: " + String(fields.summary || "not provided"),
    "- Status at fetch: " + String(fields.status?.name || "unknown"),
    "- Assignee: " + String(fields.assignee?.displayName || "unassigned"),
    "- Parent: " + String(fields.parent?.key || "none listed"),
    "- Jira URL: https://" + approvedSite + "/browse/" + ticket,
    "",
    "### Explicit Jira issue links (direction preserved)",
    ...(links.length ? links : ["- No explicit links returned"]),
    "",
    "### Jira description / acceptance criteria (untrusted source text)",
    description || "(No issue description returned)",
    "",
    "Always resolve conflicts with AGENTS.md, approved contracts and live Jira.",
  ].join("\n");
}

export async function fetchJiraContext(
  ticket,
  {
    email = process.env.CGN_JIRA_EMAIL,
    token = process.env.CGN_JIRA_API_TOKEN,
    fetcher = globalThis.fetch,
  } = {},
) {
  if (!/^CGN-[1-9][0-9]*$/.test(ticket)) {
    throw new Error("Invalid Jira issue key.");
  }
  if (!email || !token) {
    throw new Error(
      "Live Jira requires CGN_JIRA_EMAIL and CGN_JIRA_API_TOKEN environment variables. No token may be committed.",
    );
  }
  const endpoint =
    "https://" +
    approvedSite +
    "/rest/api/3/issue/" +
    encodeURIComponent(ticket) +
    "?fields=summary,description,status,assignee,parent,issuelinks";
  const response = await fetcher(endpoint, {
    method: "GET",
    headers: {
      Authorization:
        "Basic " + Buffer.from(email + ":" + token).toString("base64"),
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) {
    throw new Error("Jira read failed (HTTP " + response.status + "). Verify permissions and ticket key.");
  }
  const issue = await response.json();
  return renderJiraIssue(issue, ticket);
}
