/**
 * CGN-128 UI-only status submission gate.
 *
 * This is NOT a persistence adapter or an API contract. The caller must supply
 * an authenticated-session check and an owning-service adapter that maps a UI
 * choice into the separately approved stage/goal model, persists it, and
 * returns true ONLY after the server confirms the authorized write.
 */
import { STATUS_CHOICES } from "./navigation.mjs";

export class CurrentStatusGateError extends Error {
  constructor(message, code) {
    super(message);
    this.name = "CurrentStatusGateError";
    this.code = code;
  }
}

export function createCurrentStatusGate({
  isAuthenticated,
  persistStatusChoice,
} = {}) {
  if (
    typeof isAuthenticated !== "function" ||
    typeof persistStatusChoice !== "function"
  ) {
    throw new TypeError("Session and approved persistence adapters are required");
  }

  let pending = false;

  return Object.freeze({
    async submit(choice) {
      if (pending) {
        throw new CurrentStatusGateError(
          "Current status save is already in progress",
          "SAVE_IN_PROGRESS",
        );
      }
      if (!STATUS_CHOICES.includes(choice)) {
        throw new CurrentStatusGateError(
          "Choose one supported current status",
          "INVALID_STATUS_CHOICE",
        );
      }
      pending = true;
      try {
        if ((await isAuthenticated()) !== true) {
          throw new CurrentStatusGateError(
            "Sign in before saving your status",
            "AUTH_REQUIRED",
          );
        }
        const saved = await persistStatusChoice(choice);
        if (saved !== true) {
          throw new CurrentStatusGateError(
            "Current status was not confirmed by the server",
            "SAVE_NOT_CONFIRMED",
          );
        }
        if ((await isAuthenticated()) !== true) {
          throw new CurrentStatusGateError(
            "Sign in again before continuing",
            "AUTH_REQUIRED",
          );
        }
        return "/home";
      } finally {
        pending = false;
      }
    },
  });
}
