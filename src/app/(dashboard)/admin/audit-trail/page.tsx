"use client"

import { useState, useEffect, useMemo } from "react"
import { Shield, Search, Filter, Clock, User, FileText, ArrowRightLeft, MessageSquare, Trash2, Edit, Plus, Building2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { fmtDateTime } from "@/lib/utils"

interface AuditEntry {
  id: string
  timestamp: string
  actor: string
  actorEmail: string
  action: string
  target: string
  targetId: string
  module: string
  details: string
  category: "request" | "status" | "comment" | "assignment" | "user" | "role" | "company_data"
}

const CATEGORY_COLORS: Record<AuditEntry["category"], string> = {
  request:      "bg-blue-100 text-blue-700",
  status:       "bg-amber-100 text-amber-700",
  comment:      "bg-purple-100 text-purple-700",
  assignment:   "bg-sky-100 text-sky-700",
  user:         "bg-green-100 text-green-700",
  role:         "bg-red-100 text-red-700",
  company_data: "bg-indigo-100 text-indigo-700",
}

const CATEGORY_ICONS: Record<AuditEntry["category"], React.ElementType> = {
  request:      FileText,
  status:       ArrowRightLeft,
  comment:      MessageSquare,
  assignment:   User,
  user:         User,
  role:         Shield,
  company_data: Building2,
}

async function buildUserMap(): Promise<Record<string, string>> {
  const map: Record<string, string> = {}

  // Primary source: /api/users — has every user with their real ID (Google sub or USR-*)
  try {
    const res = await fetch("/api/users", { cache: "no-store" })
    if (res.ok) {
      const json = await res.json()
      const users: any[] = Array.isArray(json) ? json : (json.users ?? [])
      users.forEach((u: any) => {
        if (u.id && u.name) map[u.id] = u.name
        if (u.email && u.name) map[u.email] = u.name
      })
    }
  } catch {}

  // Secondary: requests in localStorage (requester name by ID)
  try {
    const raw = localStorage.getItem("arp_requests")
    const requests: any[] = raw ? JSON.parse(raw) : []
    requests.forEach((req: any) => {
      if (req.requesterId && req.requesterName) map[req.requesterId] = req.requesterName
      if (req.requesterEmail && req.requesterName) map[req.requesterEmail] = req.requesterName
    })
  } catch {}

  // Tertiary: tasks
  try {
    const raw = localStorage.getItem("admin_tasks")
    const tasks: any[] = raw ? JSON.parse(raw) : []
    tasks.forEach((task: any) => {
      if (task.createdById && task.createdBy) map[task.createdById] = task.createdBy
      ;(task.activity ?? []).forEach((a: any) => {
        if (a.userId && a.user) map[a.userId] = a.user
      })
    })
  } catch {}

  return map
}

function resolveActor(changedBy: string, userMap: Record<string, string>): string {
  if (!changedBy) return "System"
  return userMap[changedBy] || userMap[changedBy.toLowerCase()] || changedBy
}

async function buildAuditLog(): Promise<AuditEntry[]> {
  if (typeof window === "undefined") return []

  const entries: AuditEntry[] = []
  const userMap = await buildUserMap()

  // Fetch requests from server (authoritative) and fall back to localStorage
  let requests: any[] = []
  try {
    const res = await fetch("/api/requests", { cache: "no-store" })
    if (res.ok) {
      const json = await res.json()
      requests = Array.isArray(json?.data) ? json.data : []
    }
  } catch {}
  if (requests.length === 0) {
    try {
      const raw = localStorage.getItem("arp_requests")
      requests = raw ? JSON.parse(raw) : []
    } catch {}
  }

  // --- Requests ---
  try {
    requests.forEach((req: any) => {
      // Creation
      entries.push({
        id: `${req.id}-created`,
        timestamp: req.createdAt,
        actor: req.requesterName,
        actorEmail: req.requesterEmail,
        action: "Created request",
        target: req.title,
        targetId: req.id,
        module: req.module,
        details: `New ${req.module} request submitted`,
        category: "request",
      })

      // Status history
      ;(req.statusHistory ?? []).slice(1).forEach((sh: any, i: number) => {
        entries.push({
          id: `${req.id}-status-${i}`,
          timestamp: sh.changedAt,
          actor: resolveActor(sh.changedBy, userMap),
          actorEmail: "",
          action: "Status changed",
          target: req.title,
          targetId: req.id,
          module: req.module,
          details: sh.comment ?? `→ ${sh.status}`,
          category: "status",
        })
      })

      // Comments
      ;(req.commentHistory ?? []).forEach((ch: any, i: number) => {
        entries.push({
          id: `${req.id}-comment-${i}`,
          timestamp: ch.changedAt,
          actor: resolveActor(ch.changedBy, userMap),
          actorEmail: "",
          action: "Comment added",
          target: req.title,
          targetId: req.id,
          module: req.module,
          details: "Comment posted on request",
          category: "comment",
        })
      })
    })
  } catch {}

  // --- Tasks ---
  try {
    const raw = localStorage.getItem("admin_tasks")
    const tasks: any[] = raw ? JSON.parse(raw) : []
    tasks.forEach((task: any) => {
      // taskService writes `assignedBy` on the Task record and `changedBy`
      // on each TaskActivity entry. Fall back to the first activity entry's
      // changedBy in case an older record is missing assignedBy.
      const creator = task.assignedBy
        ?? task.createdBy
        ?? task.activity?.[0]?.changedBy
        ?? "System"

      entries.push({
        id: `task-${task.id}-created`,
        timestamp: task.createdAt,
        actor: resolveActor(creator, userMap),
        actorEmail: "",
        action: "Task created",
        target: task.title,
        targetId: task.id,
        module: "tasks",
        details: `Assigned to ${task.assignedTo ?? "Unassigned"}`,
        category: "request",
      })
      ;(task.activity ?? []).forEach((a: any, i: number) => {
        const aType = a.type ?? a.action
        const aWhen = a.changedAt ?? a.timestamp
        const aWho  = a.changedBy ?? a.user ?? "System"
        if (aType === "status_changed") {
          entries.push({
            id: `task-${task.id}-act-${i}`,
            timestamp: aWhen,
            actor: resolveActor(aWho, userMap),
            actorEmail: "",
            action: "Task status changed",
            target: task.title,
            targetId: task.id,
            module: "tasks",
            details: a.details ?? a.description ?? "",
            category: "status",
          })
        }
      })
    })
  } catch {}

  // --- Client-side Audit Events (deletions, edits from localStorage) ---
  try {
    const { getAuditEvents } = await import("@/lib/auditLog")
    const auditEvents = getAuditEvents()
    auditEvents.forEach((ev) => {
      entries.push({
        id: ev.id,
        timestamp: ev.timestamp,
        actor: resolveActor(ev.actor, userMap),
        actorEmail: ev.actorEmail,
        action:
          ev.action === "request_deleted"  ? "Request deleted"
          : ev.action === "request_edited" ? "Request edited"
          : ev.action === "request_assigned" ? "Assigned"
          : "Submission error",
        target: ev.targetTitle,
        targetId: ev.targetId,
        module: ev.module,
        details: ev.details,
        category: ev.action === "request_assigned" ? "assignment" : "request",
      })
    })
  } catch {}

  // --- Server-side Audit Log (user/role changes from API routes) ---
  try {
    const res = await fetch("/api/admin/audit-log", { cache: "no-store" })
    if (res.ok) {
      const json = await res.json()
      const serverEvents: any[] = Array.isArray(json?.data) ? json.data : []
      serverEvents.forEach((ev) => {
        const actionLabel: Record<string, string> = {
          user_created:          "User created",
          user_updated:          "User updated",
          user_deleted:          "User deleted",
          user_role_changed:     "Role changed",
          user_password_reset:   "Password reset",
          role_created:          "Role created",
          role_updated:          "Role updated",
          role_deleted:          "Role deleted",
          company_data_updated:  "Company Data updated",
          request_deleted:       "Request deleted",
          request_edited:        "Request edited",
        }
        entries.push({
          id: ev.id,
          timestamp: ev.timestamp,
          actor: resolveActor(ev.actor, userMap),
          actorEmail: ev.actorEmail ?? "",
          action: actionLabel[ev.action] ?? ev.action,
          target: ev.targetTitle,
          targetId: ev.targetId,
          module: ev.category === "role" ? "roles" : ev.category === "user" ? "users" : ev.action === "company_data_updated" ? "company data" : ev.module ?? "",
          details: ev.details,
          category: (ev.action === "company_data_updated" ? "company_data" : ev.category) as AuditEntry["category"],
        })
      })
    }
  } catch {}

  // Sort newest first
  return entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
}

function fmt(iso: string) { return fmtDateTime(iso) }

const ALL_CATEGORIES: AuditEntry["category"][] = ["request", "status", "comment", "assignment", "user", "role", "company_data"]

export default function AuditTrailPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<AuditEntry["category"] | "all">("all")

  useEffect(() => {
    void buildAuditLog().then(setEntries)
  }, [])

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      const matchCat = categoryFilter === "all" || e.category === categoryFilter
      const q = search.toLowerCase()
      const matchSearch = !q || [e.actor, e.action, e.target, e.targetId, e.details, e.module]
        .some((v) => v.toLowerCase().includes(q))
      return matchCat && matchSearch
    })
  }, [entries, search, categoryFilter])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Audit Trail</h1>
        <p className="text-sm text-gray-500 mt-1">Complete history of all system activity and changes</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {(["request","status","comment","assignment","company_data"] as const).map((cat) => {
          const Icon = CATEGORY_ICONS[cat]
          const count = entries.filter((e) => e.category === cat).length
          return (
            <Card key={cat} className="border shadow-sm cursor-pointer hover:border-blue-300 transition-colors"
              onClick={() => setCategoryFilter(categoryFilter === cat ? "all" : cat)}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`rounded-lg p-2 ${CATEGORY_COLORS[cat]}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 capitalize">{cat === "company_data" ? "Company Data" : cat === "assignment" ? "Assignments" : cat} events</p>
                  <p className="text-xl font-bold text-gray-900">{count}</p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Filters + Table */}
      <Card className="border shadow-sm">
        <CardHeader className="border-b bg-gray-50 rounded-t-lg pb-3">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by user, action, request..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setCategoryFilter("all")}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${categoryFilter === "all" ? "bg-slate-800 text-white border-slate-800" : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"}`}
              >All</button>
              {ALL_CATEGORIES.map((cat) => {
                const Icon = CATEGORY_ICONS[cat]
                const label = cat === "company_data" ? "Company Data" : cat === "assignment" ? "Assignments" : cat.charAt(0).toUpperCase() + cat.slice(1)
                return (
                  <button key={cat}
                    onClick={() => setCategoryFilter(categoryFilter === cat ? "all" : cat)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-colors ${categoryFilter === cat ? "bg-slate-800 text-white border-slate-800" : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"}`}
                  >
                    <Icon className="h-3 w-3" />
                    {label}
                  </button>
                )
              })}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <Shield className="h-10 w-10 mb-3 text-gray-200" />
              <p className="text-sm font-medium">No audit events found</p>
              <p className="text-xs mt-1">Activity will appear here as users interact with the system</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filtered.map((entry) => {
                const Icon = CATEGORY_ICONS[entry.category]
                return (
                  <div key={entry.id} className="flex items-start gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors">
                    <div className={`mt-0.5 rounded-lg p-2 shrink-0 ${CATEGORY_COLORS[entry.category]}`}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      {/* Action headline */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-semibold text-gray-900">
                          {entry.actor || entry.actorEmail || "System"}
                        </span>
                        <span className="text-sm text-gray-500">{entry.action}</span>
                      </div>

                      {/* Who / what was affected — only show when different from actor */}
                      {entry.target && entry.target !== (entry.actor || entry.actorEmail) && (
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">On:</span>
                          <span className="text-xs font-semibold text-gray-700">{entry.target}</span>
                          {entry.targetId && (
                            <span className="text-[10px] font-mono bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                              {entry.targetId}
                            </span>
                          )}
                        </div>
                      )}
                      {/* Self-action (actor == target): just show the ID */}
                      {entry.target && entry.target === (entry.actor || entry.actorEmail) && entry.targetId && (
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] font-mono bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                            {entry.targetId}
                          </span>
                        </div>
                      )}

                      {/* Details line */}
                      {entry.details && (
                        <p className="text-xs text-gray-400 mt-0.5 italic">{entry.details}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <Badge className={`text-[10px] capitalize mb-1 ${CATEGORY_COLORS[entry.category]}`}>{entry.module}</Badge>
                      <p className="text-[11px] text-gray-400 whitespace-nowrap">{fmt(entry.timestamp)}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          {filtered.length > 0 && (
            <div className="px-5 py-3 border-t bg-gray-50 text-[11px] text-gray-400 text-right">
              Showing {filtered.length} of {entries.length} events
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
