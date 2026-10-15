import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import {
  needsTicketHandoff,
  ticketFromBranch,
  validateTicketHandoff,
} from "./agent-handoff-policy.mjs";

function fail(message) {
  console.error("CGN ticket handoff gate failed: " + message);
  process.exitCode = 1;
}

const base = process.env.CGN_BASE_SHA;
const branch = process.env.GITHUB_HEAD_REF;

if (!base || !/^[a-f0-9]{40}$/.test(base)) {
  fail("CGN_BASE_SHA must be the 40-character PR base commit SHA.");
} else {
  try {
    const changed = execFileSync(
      "git",
      ["diff", "--name-only", base + "...HEAD"],
      { encoding: "utf8" },
    )
      .trim()
      .split(/\r?\n/)
      .filter(Boolean);

    if (!needsTicketHandoff(changed)) {
      console.log("Docs-only or non-code PR: handoff gate not applicable.");
    } else {
      const ticket = ticketFromBranch(branch);
      if (!ticket) {
        fail("Code changes require a CGN-NNN-description branch.");
      } else {
        const handoff = "docs/handoffs/" + ticket + ".md";
        if (!changed.includes(handoff)) {
          fail("Changed code requires changed " + handoff);
        } else {
          const errors = validateTicketHandoff(
            ticket,
            readFileSync(handoff, "utf8"),
          );
          if (errors.length) {
            for (const error of errors) fail(error);
          } else {
            console.log("Ticket handoff gate passed for " + ticket);
          }
        }
      }
    }
  } catch (error) {
    fail(error.message);
  }
}
