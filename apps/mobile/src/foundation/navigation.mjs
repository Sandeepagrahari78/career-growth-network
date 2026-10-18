/** CGN-128: Android navigation logic, independent of UI framework/API. */
export const CGN_TABS = Object.freeze([
  Object.freeze({ id: "home", label: "Home", route: "/home" }),
  Object.freeze({ id: "explore", label: "Explore", route: "/explore" }),
  Object.freeze({ id: "journey", label: "Journey", route: "/journey" }),
  Object.freeze({ id: "chats", label: "Chats", route: "/chats" }),
  Object.freeze({ id: "profile", label: "Profile", route: "/profile" }),
]);

// UX shortcut only. Stage and preparation goal are separate domain facts.
export const STATUS_CHOICES = Object.freeze([
  "11th",
  "12th",
  "B.Tech",
  "B.Sc",
  "NEET Prep",
  "JEE Prep",
  "UPSC Prep",
  "Other",
]);

/** A local status does not prove an authorized session. */
export function resolveEntryRoute({ session, currentStatus } = {}) {
  if (session !== "authenticated") return "/login";
  if (typeof currentStatus !== "string" || !currentStatus.trim()) {
    return "/current-status";
  }
  return "/home";
}

export function getTabRoute(tabId) {
  const entry = CGN_TABS.find((tab) => tab.id === tabId);
  if (!entry) throw new RangeError("Unknown CGN primary tab");
  return entry.route;
}
