/** Server-side separation of duties for destructive database operations. */
export type DatabaseOperation = "view" | "backup" | "restore" | "purge"

type DatabaseActor = { role?: string | null; permissions?: string[] | null }

export function canManageDatabase(actor: DatabaseActor | undefined | null, operation: DatabaseOperation): boolean {
  const permissions = actor?.permissions ?? []
  if (actor?.role === "Full Access" || permissions.includes("*")) return true
  if (operation === "view") return permissions.includes("page:admin-database") || permissions.includes("manage_users")
  if (operation === "backup") return permissions.includes("manage_backups")
  if (operation === "restore") return permissions.includes("restore_backups")
  return permissions.includes("purge_data")
}

export function requestMetadata(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")
  return {
    ipAddress: (forwarded?.split(",")[0] ?? request.headers.get("x-real-ip") ?? "").trim(),
    userAgent: request.headers.get("user-agent") ?? "",
    path: new URL(request.url).pathname,
  }
}
