/**
 * Single source of truth for which support function ("portal") owns each
 * request module, and which other functions are allowed to see it.
 *
 * Why this exists: every function's aggregate views (Dashboard, All
 * Requests, Feedback & Reports) must show only that function's own data —
 * confidentiality between departments depends on it. Rather than each
 * function's page maintaining its own "exclude these other modules" list
 * (easy to forget to update), every module is registered here ONCE with
 * its owner, and visibility is derived from that registration.
 *
 * Fail-closed by design: a module id that isn't registered here is
 * invisible to every function (see `isModuleVisibleToFunction`) — so a
 * newly-added module can never accidentally leak into another function's
 * view just because someone forgot to add an exclusion somewhere.
 *
 * Adding a new module for an existing or new function:
 *   1. Add one entry below with its `owner` (and `sharedWith` only if
 *      another function genuinely needs to see it too — e.g. because that
 *      other function is where requests get submitted from).
 *   2. That's it. Every function's aggregate view calls
 *      `modulesVisibleToFunction(<that function>)` and picks the change up
 *      automatically — no other file needs to change.
 */

export type FunctionId = "admin" | "hr" | "finance"

export interface ModuleOwnership {
  /** The function whose staff actually process this module's requests. */
  owner: FunctionId
  /**
   * Other functions that legitimately also need visibility — typically
   * because that function's portal is where the request gets submitted
   * from, even though a different function's staff handle it.
   */
  sharedWith?: FunctionId[]
}

export const MODULE_REGISTRY: Record<string, ModuleOwnership> = {
  // Administration Team's own service modules
  shipping: { owner: "admin" },
  maintenance: { owner: "admin" },
  purchase: { owner: "admin" },
  event: { owner: "admin" },
  travel: { owner: "admin" },
  general: { owner: "admin" },

  // "hr" (Onboarding/Offboarding) is owned by Admin, shared with HR: the
  // HR Team is the *requester* here — informing Administration Team about
  // a new hire or leaver — and Administration Team is who actually
  // executes the operational items (access card, seating, medical
  // insurance, desk/office). "hr_general", "hr_letter", and "hr_travel_letter"
  // are different: HR-Portal-exclusive intake channels that HR Team itself
  // owns and processes, with no Admin-Portal involvement, so they stay HR-only.
  hr: { owner: "admin", sharedWith: ["hr"] },
  hr_general: { owner: "hr" },
  hr_letter: { owner: "hr" },
  hr_travel_letter: { owner: "hr" },

  // Finance Team's own service modules.
  finance_reimbursement: { owner: "finance" },
}

/** True if `fn` is allowed to see requests from `moduleId`. Unregistered module ids are hidden from everyone by default. */
export function isModuleVisibleToFunction(moduleId: string, fn: FunctionId): boolean {
  const entry = MODULE_REGISTRY[moduleId]
  if (!entry) return false
  return entry.owner === fn || (entry.sharedWith?.includes(fn) ?? false)
}

/**
 * The function that owns (executes) work for a module — drives which
 * function's email account sends notifications for that module. Falls back
 * to "admin" for unregistered module ids.
 */
export function functionForModule(moduleId: string): FunctionId {
  return MODULE_REGISTRY[moduleId]?.owner ?? "admin"
}

/** Every module id visible to `fn` — pass this as the `moduleScope` for that function's Dashboard / All Requests / Feedback & Reports. */
export function modulesVisibleToFunction(fn: FunctionId): string[] {
  return Object.keys(MODULE_REGISTRY).filter((moduleId) => isModuleVisibleToFunction(moduleId, fn))
}

/**
 * The real-world team/role name whose members actually process a function's
 * requests — used to resolve notification and CC audiences (e.g. "who is
 * 'Administration Team' for module X?").
 */
export const FUNCTION_TEAM_ROLE: Record<FunctionId, string> = {
  admin: "Administration Team",
  hr: "People Team",
  finance: "Finance Team",
}

/** The team role that owns (executes) work for a given module id. Falls back to Administration Team for unregistered ids. */
export function ownerTeamRoleForModule(moduleId: string): string {
  const entry = MODULE_REGISTRY[moduleId]
  return FUNCTION_TEAM_ROLE[entry?.owner ?? "admin"]
}

/** Every team role name allowed to see a module (owner + sharedWith), for notification/CC fan-out. */
export function teamRolesForModule(moduleId: string): string[] {
  const entry = MODULE_REGISTRY[moduleId]
  if (!entry) return []
  const roles = new Set<string>([FUNCTION_TEAM_ROLE[entry.owner]])
  entry.sharedWith?.forEach((fn) => roles.add(FUNCTION_TEAM_ROLE[fn]))
  return Array.from(roles)
}

/** Maps a real role name back to the FunctionId whose team it belongs to, or null if it isn't a function "team" role (e.g. Full Access, Requester, Manager). */
export function roleToFunctionId(role?: string | null): FunctionId | null {
  if (role === "Administration Team") return "admin"
  if (role === "People Team") return "hr"
  if (role === "Finance Team") return "finance"
  return null
}

/**
 * Whether a signed-in viewer may see a specific request, used to close the
 * gap where a module is function-exclusive (owner isn't "admin" and isn't
 * shared with "admin") — e.g. hr_general, hr_letter, finance_reimbursement.
 * Admin-visible modules stay open to any authenticated user, matching the
 * existing platform convention (module pages have always been reachable by
 * any signed-in user; aggregate views do the real scoping). Full Access
 * always sees everything. Otherwise a viewer may see the request if their
 * team owns/shares the module, or they are the requester or a CC recipient.
 */
export function isRequestVisibleToViewer(params: {
  moduleId: string
  role?: string | null
  viewerEmail?: string | null
  requesterEmail?: string | null
  ccEmails?: string[]
}): boolean {
  if (params.role === "Full Access") return true
  if (isModuleVisibleToFunction(params.moduleId, "admin")) return true
  const fn = roleToFunctionId(params.role)
  if (fn && isModuleVisibleToFunction(params.moduleId, fn)) return true
  const viewer = (params.viewerEmail ?? "").trim().toLowerCase()
  if (!viewer) return false
  if ((params.requesterEmail ?? "").trim().toLowerCase() === viewer) return true
  return (params.ccEmails ?? []).some((e) => (e ?? "").trim().toLowerCase() === viewer)
}
