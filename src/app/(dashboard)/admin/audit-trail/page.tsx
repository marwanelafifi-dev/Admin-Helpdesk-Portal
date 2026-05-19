"use client"

import { useState, useEffect, useMemo } from "react"
import { Shield, Search, Filter, Clock, User, FileText, ArrowRightLeft, MessageSquare, Trash2, Edit, Plus } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

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
  category: "request" | "status" | "comment" | "user" | "role" | "task" | "auth"
}

const CATEGORY_COLORS: Record<AuditEntry["category"], string> = {
  request: "bg-blue-100 text-blue-700",
  status:  "bg-amber-100 text-amber-700",
  comment: "bg-purple-100 text-purple-700",
  user:    "bg-green-100 text-green-700",
  role:    "bg-red-100 text-red-700",
  task:    "bg-slate-100 text-slate-700",
  auth:    "bg-emerald-100 text-emerald-700",
}

const CATEGORY_ICONS: Record<AuditEntry["category"], React.ElementType> = {
  request: FileText,
  status:  ArrowRightLeft,
  comment: MessageSquare,
  user:    User,
  role:    Shield,
  task:    Edit,
  auth:    Clock,
}

function buildUserMap(): Record<string, string> {
  // Build a map of userId → display name from all requests in localStorage
  const map: Record<string, string> = {}
  try {
    const raw = localStorage.getItem("arp_requests")
    const requests: any[] = raw ? JSON.parse(raw) : []
    requests.forEach((req: any) => {
      if (req.requesterId && req.requesterName) {
        map[req.requesterId] = req.requesterName
      }
    })
  } catch {}
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
  // If it looks like a user ID, try to resolve it
  if (/^USR-/.test(changedBy)) {
    return userMap[changedBy] || changedBy
  }
  return changedBy
}

function buildAuditLog(): AuditEntry[] {
  if (typeof window === "undefined") return []

  const entries: AuditEntry[] = []
  const userMap = buildUserMap()

  // --- Requests ---
  try {
    const raw = localStorage.getItem("arp_requests")
    const requests: any[] = raw ? JSON.parse(raw) : []

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
        category: "task",
      })
      ;(task.activity ?? []).forEach((a: any, i: number) => {
        // TaskActivity uses `type` / `changedAt` / `changedBy` (and historically
        // a few records may have `action` / `timestamp` / `user`). Read both.
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
            category: "task",
          })
        }
      })
    })
  } catch {}

  // Sort newest first
  return entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
}

function fmt(iso: string) {
  try {
    return new Date(iso).toLocaleString("en-GB", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    })
  } catch { return iso }
}

const ALL_CATEGORIES: AuditEntry["category"][] = ["request", "status", "comment", "user", "role", "task", "auth"]

export default function AuditTrailPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<AuditEntry["category"] | "all">("all")

  useEffect(() => {
    setEntries(buildAuditLog())
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {(["request","status","comment","task"] as const).map((cat) => {
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
                  <p className="text-xs text-gray-500 capitalize">{cat} events</p>
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
              {ALL_CATEGORIES.map((cat) => (
                <button key={cat}
                  onClick={() => setCategoryFilter(categoryFilter === cat ? "all" : cat)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border capitalize transition-colors ${categoryFilter === cat ? "bg-slate-800 text-white border-slate-800" : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"}`}
                >{cat}</button>
              ))}
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
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-gray-900">{entry.actor || entry.actorEmail || "System"}</span>
                        <span className="text-sm text-gray-500">{entry.action}</span>
                        {entry.targetId && (
                          <span className="text-xs font-mono bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{entry.targetId}</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 truncate">{entry.target}</p>
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
