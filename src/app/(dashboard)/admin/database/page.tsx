"use client"

import { useState, useRef, useEffect } from "react"
import { useSession } from "next-auth/react"
import {
  Download, Upload, CheckCircle2, AlertTriangle, Clock, Shield, Trash2,
  Package, Wrench, ShoppingCart, CalendarDays, Plane, UserCog, ChevronRight, Inbox,
  Power, LogOut, RefreshCw, Save, CalendarClock, FolderOpen,
  MessageSquare, Building2, Settings, Mail, RotateCcw,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  NON_REQUEST_STORES,
  ALL_REGISTERED_KEYS,
  discoverAllOwnedKeys,
  isOwnedKey,
  STORE_BY_KEY,
} from "@/lib/dataStoreRegistry"
import { fmtDateTime } from "@/lib/utils"
import type { DeletedRequest } from "@/lib/deletedRequestStore"
import { logAuditEvent } from "@/lib/auditLog"

// ── Types ────────────────────────────────────────────────────────────────────

interface BackupManifest {
  /** "1.0" backups only contain `data` (browser localStorage).
   *  "1.1" backups also contain `serverData` (the server's /app/data files). */
  version: "1.0" | "1.1"
  createdAt: string
  createdBy: string
  /** Browser localStorage keys -> their parsed values. */
  data: Record<string, unknown>
  /** Server-side /app/data files (filename -> JSON content). Only present on 1.1+. */
  serverData?: Record<string, unknown>
}

type Status = { type: "success" | "error" | "idle"; message: string }

// ── Constants ────────────────────────────────────────────────────────────────

// Module definitions — each maps to a filter on arp_requests[].module
const REQUEST_MODULES = [
  { id: "shipping",    label: "Shipping",    icon: Package,       color: "text-blue-600",   bg: "bg-blue-50",   border: "border-blue-200" },
  { id: "maintenance", label: "Maintenance", icon: Wrench,        color: "text-orange-600", bg: "bg-orange-50", border: "border-orange-200" },
  { id: "purchase",    label: "Purchase",    icon: ShoppingCart,  color: "text-purple-600", bg: "bg-purple-50", border: "border-purple-200" },
  { id: "event",       label: "Event",       icon: CalendarDays,  color: "text-pink-600",   bg: "bg-pink-50",   border: "border-pink-200" },
  { id: "travel",      label: "Travel",      icon: Plane,         color: "text-cyan-600",   bg: "bg-cyan-50",   border: "border-cyan-200" },
  { id: "hr",          label: "HR",          icon: UserCog,       color: "text-teal-600",   bg: "bg-teal-50",   border: "border-teal-200" },
  { id: "general",     label: "General",     icon: Inbox,         color: "text-indigo-600", bg: "bg-indigo-50", border: "border-indigo-200" },
] as const

// Note: Team Requests is a view (filtered by direct manager), not a module —
// requests are stored under their original module id. No separate clear needed.

// Other clearable stores (non-request) — sourced from central registry so new stores
// added anywhere in the app automatically appear here.
const OTHER_STORES = NON_REQUEST_STORES

// Server-side file stores shown in Clear by Data Type.
// These are data/*.json files on the server — not localStorage keys.
const SERVER_FILE_STORES = [
  {
    key: "server:requests",
    label: "Server Requests",
    description: "data/requests.json — all request records from every user",
    icon: Package, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200",
  },
  {
    key: "server:comments",
    label: "Server Comments",
    description: "data/comments.json — all comment threads on all requests",
    icon: MessageSquare, color: "text-slate-600", bg: "bg-slate-50", border: "border-slate-200",
  },
  {
    key: "server:feedback",
    label: "Server Feedback",
    description: "data/feedback.json — survey records and submitted responses",
    icon: MessageSquare, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200",
  },
  {
    key: "server:company-data",
    label: "Server Company Data",
    description: "data/company-data.json — suppliers, cost centers, managers, carriers, departments, sectors",
    icon: Building2, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200",
  },
  {
    key: "server:platform-settings",
    label: "Platform Settings",
    description: "data/platform-settings.json — branding, login page, feedback survey config",
    icon: Settings, color: "text-gray-600", bg: "bg-gray-50", border: "border-gray-200",
  },
  {
    key: "server:backup-schedule",
    label: "Backup Schedule",
    description: "data/backup-schedule.json — scheduled backup configuration",
    icon: CalendarClock, color: "text-purple-600", bg: "bg-purple-50", border: "border-purple-200",
  },
  {
    key: "server:email-config",
    label: "Email Configuration",
    description: "data/email-config.json — SMTP settings",
    icon: Mail, color: "text-orange-600", bg: "bg-orange-50", border: "border-orange-200",
  },
] as const

// ── Helpers ──────────────────────────────────────────────────────────────────

function getRequests(): Array<{ module: string }> {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem("arp_requests")
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function countByModule(moduleId: string): number {
  return getRequests().filter((r) => r.module === moduleId).length
}

function clearModuleRequests(moduleId: string): number {
  const all = getRequests()
  const filtered = all.filter((r) => r.module !== moduleId)
  localStorage.setItem("arp_requests", JSON.stringify(filtered))
  return all.length - filtered.length
}

async function collectBackup(): Promise<BackupManifest> {
  const data: Record<string, unknown> = {}
  // Discover all owned keys at runtime (registry + any present arp_*/admin_*/feedback_* keys)
  // so newly-added stores are captured even if the developer forgot to register them.
  discoverAllOwnedKeys().forEach((key) => {
    const raw = localStorage.getItem(key)
    if (raw) { try { data[key] = JSON.parse(raw) } catch { data[key] = raw } }
  })

  // Push browser localStorage snapshot to the server so scheduled/server-side
  // backups (Run Backup Now) also capture the full picture.
  try {
    await fetch("/api/admin/browser-data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data }),
    })
  } catch { /* best-effort */ }

  // Pull the server-side data bundle (comments, feedback, users, roles, + the
  // browser-data.json we just pushed) so the download is a complete snapshot.
  let serverData: Record<string, unknown> = {}
  try {
    const res = await fetch("/api/admin/server-data")
    if (res.ok) {
      const json = await res.json()
      serverData = (json.data ?? {}) as Record<string, unknown>
    }
  } catch { /* best-effort: backup still saves localStorage even if server unreachable */ }

  return {
    version: "1.1",
    createdAt: new Date().toISOString(),
    createdBy: "admin",
    data,
    serverData,
  }
}

async function restoreBackup(manifest: BackupManifest) {
  const restored: string[] = []
  const skipped: string[] = []

  // localStorage portion
  Object.entries(manifest.data ?? {}).forEach(([key, value]) => {
    try { localStorage.setItem(key, JSON.stringify(value)); restored.push(key) }
    catch { skipped.push(key) }
  })

  // Server-side portion (v1.1 backups). Older v1.0 backups simply lack this
  // key — fine, we just skip it and the user keeps whatever the server has.
  if (manifest.serverData && Object.keys(manifest.serverData).length > 0) {
    try {
      const res = await fetch("/api/admin/server-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: manifest.serverData }),
      })
      if (res.ok) {
        const json = await res.json()
        for (const f of json.restored ?? []) restored.push(`server:${f}`)
        for (const f of json.skipped ?? []) skipped.push(`server:${f}`)
      }
    } catch { skipped.push("server-data (network)") }
  }

  return { restored, skipped }
}

function clearAllOwnedKeys(): number {
  // Clear every registered key plus every runtime-discovered owned key.
  const keys = new Set<string>(ALL_REGISTERED_KEYS)
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k && isOwnedKey(k)) keys.add(k)
  }
  keys.forEach((k) => localStorage.removeItem(k))
  return keys.size
}

function fmt(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  })
}

// ── Sub-components ───────────────────────────────────────────────────────────

function StatusAlert({ status }: { status: Status }) {
  if (status.type === "idle") return null
  const ok = status.type === "success"
  return (
    <div className={`flex items-start gap-2 rounded-lg px-3 py-2.5 text-sm ${ok ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-red-50 text-red-800 border border-red-200"}`}>
      {ok ? <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" /> : <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />}
      <span>{status.message}</span>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function DatabasePage() {
  const { data: session } = useSession()
  const actorName  = session?.user?.name  ?? session?.user?.email ?? "Admin"
  const actorEmail = session?.user?.email ?? ""

  const [backupStatus, setBackupStatus]     = useState<Status>({ type: "idle", message: "" })
  const [restoreStatus, setRestoreStatus]   = useState<Status>({ type: "idle", message: "" })
  const [clearAllStatus, setClearAllStatus] = useState<Status>({ type: "idle", message: "" })
  const [storeStatus, setStoreStatus]       = useState<Status>({ type: "idle", message: "" })
  const [moduleStatus, setModuleStatus]     = useState<Status>({ type: "idle", message: "" })

  const [restoring, setRestoring]               = useState(false)
  const [lastBackupTime, setLastBackupTime]     = useState<string | null>(null)
  const [showClearAllConfirm, setShowClearAllConfirm] = useState(false)
  const [clearAllConfirmText, setClearAllConfirmText] = useState("")
  // Maintenance Mode + Force Sign-out state.
  const [maintenance, setMaintenance] = useState(false)
  const [maintenanceMessage, setMaintenanceMessage] = useState("")
  const [maintenanceStatus, setMaintenanceStatus] = useState<Status>({ type: "idle", message: "" })
  const [signoutStatus, setSignoutStatus] = useState<Status>({ type: "idle", message: "" })
  const [showSignoutConfirm, setShowSignoutConfirm] = useState(false)

  // ── Scheduled Backup state ────────────────────────────────────────────────
  const [scheduleEnabled, setScheduleEnabled]     = useState(false)
  const [scheduleFreqs, setScheduleFreqs]         = useState<("hourly"|"daily"|"weekly"|"monthly")[]>(["daily"])
  const [scheduleTime, setScheduleTime]           = useState("02:00")
  const [scheduleDayOfWeek, setScheduleDayOfWeek] = useState(0)
  const [scheduleDayOfMonth, setScheduleDayOfMonth] = useState(1)
  const [scheduleRetention, setScheduleRetention] = useState(30)
  const [scheduleLastAt, setScheduleLastAt]       = useState<string | null>(null)
  const [scheduleLastFile, setScheduleLastFile]   = useState<string | null>(null)
  const [backupFiles, setBackupFiles]             = useState<{ filename: string; size: number; createdAt: string }[]>([])
  const [scheduleSaveStatus, setScheduleSaveStatus] = useState<Status>({ type: "idle", message: "" })
  const [runNowStatus, setRunNowStatus]           = useState<Status>({ type: "idle", message: "" })
  const [runningNow, setRunningNow]               = useState(false)

  // Pull deleted requests on mount.
  useEffect(() => {
    void fetch("/api/requests/deleted").then(async (res) => {
      if (!res.ok) return
      const json = await res.json()
      if (Array.isArray(json.data)) setDeletedRequests(json.data)
    }).catch(() => {})
  }, [])

  // Pull current maintenance flag on mount so the toggle reflects reality.
  useEffect(() => {
    void fetch("/api/admin/maintenance").then(async (res) => {
      if (!res.ok) return
      const json = await res.json()
      setMaintenance(Boolean(json.maintenance))
      setMaintenanceMessage(json.maintenanceMessage ?? "")
    }).catch(() => {})

    void fetch("/api/admin/backup-schedule").then(async (res) => {
      if (!res.ok) return
      const json = await res.json()
      const s = json.schedule
      if (s) {
        setScheduleEnabled(Boolean(s.enabled))
        if (Array.isArray(s.frequencies) && s.frequencies.length > 0) setScheduleFreqs(s.frequencies)
        else if (s.frequency) setScheduleFreqs([s.frequency])
        if (s.time) setScheduleTime(s.time)
        if (typeof s.dayOfWeek === "number") setScheduleDayOfWeek(s.dayOfWeek)
        if (typeof s.dayOfMonth === "number") setScheduleDayOfMonth(s.dayOfMonth)
        if (typeof s.retentionCount === "number") setScheduleRetention(s.retentionCount)
        setScheduleLastAt(s.lastBackupAt ?? null)
        setScheduleLastFile(s.lastBackupFile ?? null)
      }
      if (Array.isArray(json.files)) setBackupFiles(json.files)
    }).catch(() => {})
  }, [])

  async function toggleMaintenance(next: boolean) {
    setMaintenanceStatus({ type: "idle", message: "" })
    try {
      const res = await fetch("/api/admin/maintenance", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maintenance: next, maintenanceMessage }),
      })
      if (!res.ok) throw new Error(await res.text())
      setMaintenance(next)
      logAuditEvent({ actor: actorName, actorEmail, action: "maintenance_toggled", targetId: "", targetTitle: "Maintenance Mode", module: "database", details: next ? "Maintenance mode turned ON — non-admin users blocked" : "Maintenance mode turned OFF — portal open to everyone" })
      setMaintenanceStatus({
        type: "success",
        message: next
          ? "Maintenance mode ON — non-admin users will be redirected to the maintenance page."
          : "Maintenance mode OFF — the app is open to everyone again.",
      })
    } catch (e: any) {
      setMaintenanceStatus({ type: "error", message: `Failed to update maintenance mode: ${e?.message ?? "unknown"}` })
    }
  }

  async function saveMaintenanceMessage() {
    setMaintenanceStatus({ type: "idle", message: "" })
    try {
      const res = await fetch("/api/admin/maintenance", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maintenanceMessage }),
      })
      if (!res.ok) throw new Error(await res.text())
      logAuditEvent({ actor: actorName, actorEmail, action: "maintenance_message_updated", targetId: "", targetTitle: "Maintenance Message", module: "database", details: `Maintenance message updated: "${maintenanceMessage.slice(0, 80)}${maintenanceMessage.length > 80 ? "…" : ""}"` })
      setMaintenanceStatus({ type: "success", message: "Message updated." })
    } catch (e: any) {
      setMaintenanceStatus({ type: "error", message: `Failed to save message: ${e?.message ?? "unknown"}` })
    }
  }

  async function forceSignoutAll() {
    setSignoutStatus({ type: "idle", message: "" })
    try {
      const res = await fetch("/api/admin/maintenance", { method: "POST" })
      if (!res.ok) throw new Error(await res.text())
      setShowSignoutConfirm(false)
      logAuditEvent({ actor: actorName, actorEmail, action: "force_signout_all", targetId: "", targetTitle: "Force Sign Out All", module: "database", details: "All active sessions invalidated — every user redirected to login" })
      setSignoutStatus({
        type: "success",
        message: "All sessions invalidated. Every user (including you) will be redirected to login on their next request.",
      })
    } catch (e: any) {
      setSignoutStatus({ type: "error", message: `Failed to force sign-out: ${e?.message ?? "unknown"}` })
    }
  }

  async function saveSchedule() {
    setScheduleSaveStatus({ type: "idle", message: "" })
    try {
      const res = await fetch("/api/admin/backup-schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: scheduleEnabled,
          frequencies: scheduleFreqs,
          time: scheduleTime,
          dayOfWeek: scheduleDayOfWeek,
          dayOfMonth: scheduleDayOfMonth,
          retentionCount: scheduleRetention,
        }),
      })
      if (!res.ok) throw new Error(await res.text())
      setScheduleSaveStatus({ type: "success", message: "Schedule saved. The backup runner will pick it up within 5 minutes." })
      setTimeout(() => setScheduleSaveStatus({ type: "idle", message: "" }), 5000)
    } catch (e: any) {
      setScheduleSaveStatus({ type: "error", message: `Failed to save: ${e?.message}` })
    }
  }

  async function runBackupNow() {
    setRunNowStatus({ type: "idle", message: "" })
    setRunningNow(true)
    try {
      // Push current browser localStorage to server first so the server-side
      // backup file includes browser data (tasks, notifications, audit log, etc.)
      const browserData: Record<string, unknown> = {}
      discoverAllOwnedKeys().forEach((key) => {
        const raw = localStorage.getItem(key)
        if (raw) { try { browserData[key] = JSON.parse(raw) } catch { browserData[key] = raw } }
      })
      await fetch("/api/admin/browser-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: browserData }),
      }).catch(() => {})

      const res = await fetch("/api/admin/backup-now", { method: "POST" })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Unknown error")
      setScheduleLastAt(new Date().toISOString())
      setScheduleLastFile(json.filename)
      if (Array.isArray(json.files)) setBackupFiles(json.files)
      logAuditEvent({ actor: actorName, actorEmail, action: "database_backup", targetId: "", targetTitle: "Scheduled Backup (Run Now)", module: "database", details: `Server backup saved as ${json.filename} (${(json.sizeBytes / 1024).toFixed(1)} KB)` })
      setRunNowStatus({ type: "success", message: `Backup saved: ${json.filename} (${(json.sizeBytes / 1024).toFixed(1)} KB, ${json.serverFiles} server files)` })
    } catch (e: any) {
      setRunNowStatus({ type: "error", message: `Backup failed: ${e?.message}` })
    } finally {
      setRunningNow(false)
    }
  }

  // Per-module confirm
  const [confirmModule, setConfirmModule] = useState<string | null>(null)
  // Per-store confirm (localStorage)
  const [confirmStore, setConfirmStore]   = useState<string | null>(null)
  // Per server-file confirm
  const [confirmServerStore, setConfirmServerStore] = useState<string | null>(null)
  const [serverStoreStatus, setServerStoreStatus] = useState<Status>({ type: "idle", message: "" })

  // ── Deleted Requests (Recycle Bin) state ──────────────────────────────────
  const [deletedRequests, setDeletedRequests] = useState<DeletedRequest[]>([])
  const [deletedStatus, setDeletedStatus] = useState<Status>({ type: "idle", message: "" })
  const [showPurgeAllConfirm, setShowPurgeAllConfirm] = useState(false)
  const [purgeAllConfirmText, setPurgeAllConfirmText] = useState("")
  const [confirmPurgeId, setConfirmPurgeId] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Recycle Bin: Restore ──────────────────────────────────────────────────
  async function handleRestore(id: string) {
    setDeletedStatus({ type: "idle", message: "" })
    try {
      const res = await fetch("/api/requests/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })
      if (!res.ok) throw new Error(await res.text())
      setDeletedRequests((prev) => prev.filter((d) => d.request.id !== id))
      setDeletedStatus({ type: "success", message: `Request ${id} has been restored and is live again.` })
    } catch (e: any) {
      setDeletedStatus({ type: "error", message: `Restore failed: ${e?.message ?? "Unknown error"}` })
    }
  }

  // ── Recycle Bin: Purge one ────────────────────────────────────────────────
  async function handlePurgeOne(id: string) {
    setDeletedStatus({ type: "idle", message: "" })
    setConfirmPurgeId(null)
    try {
      const res = await fetch(`/api/requests/deleted?id=${encodeURIComponent(id)}`, { method: "DELETE" })
      if (!res.ok) throw new Error(await res.text())
      setDeletedRequests((prev) => prev.filter((d) => d.request.id !== id))
      setDeletedStatus({ type: "success", message: `Request ${id} permanently purged from the recycle bin.` })
    } catch (e: any) {
      setDeletedStatus({ type: "error", message: `Purge failed: ${e?.message ?? "Unknown error"}` })
    }
  }

  // ── Recycle Bin: Purge all ────────────────────────────────────────────────
  async function handlePurgeAll() {
    setDeletedStatus({ type: "idle", message: "" })
    setShowPurgeAllConfirm(false)
    setPurgeAllConfirmText("")
    try {
      const res = await fetch("/api/requests/deleted", { method: "DELETE" })
      if (!res.ok) throw new Error(await res.text())
      setDeletedRequests([])
      setDeletedStatus({ type: "success", message: "Recycle bin emptied — all deleted requests permanently purged." })
    } catch (e: any) {
      setDeletedStatus({ type: "error", message: `Purge all failed: ${e?.message ?? "Unknown error"}` })
    }
  }

  // ── Backup ────────────────────────────────────────────────────────────────
  async function handleBackup() {
    try {
      const manifest = await collectBackup()
      const json = JSON.stringify(manifest, null, 2)
      const blob = new Blob([json], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      const now  = new Date()
      const dd   = String(now.getDate()).padStart(2, "0")
      const mo   = String(now.getMonth() + 1).padStart(2, "0")
      const yyyy = now.getFullYear()
      let   h    = now.getHours()
      const min  = String(now.getMinutes()).padStart(2, "0")
      const sec  = String(now.getSeconds()).padStart(2, "0")
      const ampm = h >= 12 ? "PM" : "AM"
      h = h % 12 || 12
      const filename = `Backup-${dd}-${mo}-${yyyy} - ${String(h).padStart(2, "0")}.${min}.${sec} ${ampm}.json`
      a.href = url; a.download = filename; a.click()
      URL.revokeObjectURL(url)
      setLastBackupTime(new Date().toISOString())
      const localCount  = Object.keys(manifest.data ?? {}).length
      const serverCount = Object.keys(manifest.serverData ?? {}).length
      logAuditEvent({ actor: actorName, actorEmail, action: "database_backup", targetId: "", targetTitle: "Database Backup", module: "database", details: `Downloaded ${filename} (${localCount} browser + ${serverCount} server stores)` })
      setBackupStatus({
        type: "success",
        message: `Backup downloaded — ${localCount} browser store${localCount !== 1 ? "s" : ""}` +
                 (serverCount > 0 ? ` + ${serverCount} server file${serverCount !== 1 ? "s" : ""}` : "") +
                 ` exported as ${filename}`,
      })
    } catch (e: any) {
      setBackupStatus({ type: "error", message: `Backup failed: ${e?.message ?? "Unknown error"}` })
    }
  }

  // ── Restore ───────────────────────────────────────────────────────────────
  function handleRestoreFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setRestoring(true)
    setRestoreStatus({ type: "idle", message: "" })
    const reader = new FileReader()
    reader.onload = async (ev) => {
      try {
        const manifest: BackupManifest = JSON.parse(ev.target?.result as string)
        // Accept both 1.0 (localStorage only) and 1.1 (localStorage + server data) backups
        if ((manifest.version !== "1.0" && manifest.version !== "1.1") || !manifest.data) {
          throw new Error("Invalid backup file format")
        }
        const { restored, skipped } = await restoreBackup(manifest)
        logAuditEvent({ actor: actorName, actorEmail, action: "database_restore", targetId: "", targetTitle: "Database Restore", module: "database", details: `Restored from backup dated ${fmt(manifest.createdAt)} — ${restored.length} stores restored${skipped.length ? `, ${skipped.length} skipped` : ""}` })
        setRestoreStatus({
          type: "success",
          message: `Restore complete — ${restored.length} item${restored.length !== 1 ? "s" : ""} restored from ${fmt(manifest.createdAt)}` +
                   (skipped.length ? `. ${skipped.length} skipped.` : "") +
                   ". Refresh to see restored data.",
        })
      } catch (err: any) {
        setRestoreStatus({ type: "error", message: `Restore failed: ${err?.message ?? "Invalid file"}` })
      } finally {
        setRestoring(false)
        if (fileInputRef.current) fileInputRef.current.value = ""
      }
    }
    reader.readAsText(file)
  }

  // ── Clear All ─────────────────────────────────────────────────────────────
  async function handleClearAll() {
    const cleared = clearAllOwnedKeys()
    // Wipe every clearable server-side file: requests.json, comments.json,
    // feedback.json, company-data.json. users.json / roles.json are
    // intentionally `clearable: false` so admins can't lock themselves out.
    let serverCleared = 0
    try {
      const res = await fetch("/api/admin/server-data", { method: "DELETE" })
      if (res.ok) {
        const json = await res.json()
        serverCleared = Array.isArray(json.cleared) ? json.cleared.length : 0
      }
    } catch { /* best-effort */ }
    // Tell every open tab to forget its localStorage cache (engine + company
    // data sync hooks listen for this and refetch from the now-empty server).
    try {
      window.dispatchEvent(new Event("arp:storage"))
      // Also bump a broadcast key so OTHER tabs (real `storage` event only
      // fires cross-tab when localStorage changes — toggling this key does it).
      localStorage.setItem("arp_global_clear_broadcast", String(Date.now()))
    } catch {}
    logAuditEvent({ actor: actorName, actorEmail, action: "database_clear", targetId: "", targetTitle: "Clear All Data", module: "database", details: `Wiped all data — ${cleared} browser stores + ${serverCleared} server files cleared` })
    setShowClearAllConfirm(false)
    setClearAllConfirmText("")
    setClearAllStatus({
      type: "success",
      message: `All data cleared — ${cleared} browser store${cleared !== 1 ? "s" : ""}` +
               (serverCleared > 0 ? ` + ${serverCleared} server file${serverCleared !== 1 ? "s" : ""}` : "") +
               ". User accounts and roles are preserved. Other open tabs will sync on focus.",
    })
  }

  // ── Clear Module ──────────────────────────────────────────────────────────
  async function handleClearModule(moduleId: string) {
    // Wipe both browser cache AND the server-side store so the next
    // sync doesn't immediately repopulate the cleared rows.
    const removedLocal = clearModuleRequests(moduleId)
    let serverRemoved = 0
    try {
      const res = await fetch(`/api/requests?module=${encodeURIComponent(moduleId)}`, { method: "DELETE" })
      if (res.ok) {
        const json = await res.json()
        serverRemoved = typeof json.removed === "number" ? json.removed : 0
      }
    } catch { /* best-effort */ }
    // Tell every open tab to invalidate its cache and pull fresh.
    try {
      window.dispatchEvent(new Event("arp:storage"))
      localStorage.setItem("arp_global_clear_broadcast", String(Date.now()))
    } catch {}
    const label = REQUEST_MODULES.find((m) => m.id === moduleId)?.label ?? moduleId
    const removed = Math.max(removedLocal, serverRemoved)
    logAuditEvent({ actor: actorName, actorEmail, action: "database_clear", targetId: moduleId, targetTitle: `Clear Module: ${label}`, module: "database", details: `${removed} ${label} request${removed !== 1 ? "s" : ""} permanently deleted` })
    setConfirmModule(null)
    setModuleStatus({ type: "success", message: `${label} data cleared — ${removed} request${removed !== 1 ? "s" : ""} removed from the server and every browser.` })
  }

  // ── Clear Store ───────────────────────────────────────────────────────────
  async function handleClearStore(key: string) {
    // Each shared store (requests, comments, feedback, company-data) needs
    // its corresponding server file wiped — otherwise the sync hooks just
    // repopulate the local cache from the still-full server on next tick.
    try {
      if (key === "arp_requests") {
        await fetch("/api/requests", { method: "DELETE" })
      } else if (key === "feedback_surveys" || key === "feedback_responses") {
        await fetch("/api/feedback/responses", { method: "DELETE" })
      } else if (key === "arp_company_data") {
        // Reset to the canonical empty shape so dropdowns just show empty.
        await fetch("/api/company-data", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            suppliers: [], cost_centers: [], managers: [],
            carriers: [], departments: [], sectors: [],
          }),
        })
      }
    } catch {
      setStoreStatus({ type: "error", message: "Failed to clear server-side data." })
      setConfirmStore(null)
      return
    }
    // Always wipe the local cache too, then broadcast so other tabs follow.
    try { localStorage.removeItem(key) } catch {}
    try {
      window.dispatchEvent(new Event("arp:storage"))
      localStorage.setItem("arp_global_clear_broadcast", String(Date.now()))
    } catch {}
    const label = STORE_BY_KEY[key]?.label ?? key
    logAuditEvent({ actor: actorName, actorEmail, action: "database_clear", targetId: key, targetTitle: `Clear Store: ${label}`, module: "database", details: `"${label}" store cleared (browser + server)` })
    setConfirmStore(null)
    setStoreStatus({ type: "success", message: `${label} cleared on the server and in every browser.` })
  }

  // ── Clear Server File ─────────────────────────────────────────────────────
  async function handleClearServerStore(key: string) {
    setServerStoreStatus({ type: "idle", message: "" })
    const store = SERVER_FILE_STORES.find((s) => s.key === key)
    const label = store?.label ?? key
    try {
      if (key === "server:requests") {
        await fetch("/api/requests", { method: "DELETE" })
        try { localStorage.removeItem("arp_requests") } catch {}
      } else if (key === "server:comments") {
        await fetch("/api/admin/server-data", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: { "comments.json": {} } }),
        })
      } else if (key === "server:feedback") {
        await fetch("/api/feedback/responses", { method: "DELETE" })
        try { localStorage.removeItem("feedback_surveys"); localStorage.removeItem("feedback_responses") } catch {}
      } else if (key === "server:company-data") {
        const empty = { suppliers: [], cost_centers: [], managers: [], carriers: [], departments: [], sectors: [] }
        await fetch("/api/company-data", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(empty),
        })
        try { localStorage.removeItem("arp_company_data") } catch {}
      } else if (key === "server:platform-settings") {
        await fetch("/api/admin/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        })
        try { localStorage.removeItem("arp_platform_settings") } catch {}
      } else if (key === "server:backup-schedule") {
        await fetch("/api/admin/backup-schedule", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ enabled: false, lastBackupAt: null, lastBackupFile: null }),
        })
      } else if (key === "server:email-config") {
        await fetch("/api/admin/server-data", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: { "email-config.json": {} } }),
        })
      }
      try {
        window.dispatchEvent(new Event("arp:storage"))
        localStorage.setItem("arp_global_clear_broadcast", String(Date.now()))
      } catch {}
      logAuditEvent({ actor: actorName, actorEmail, action: "database_clear", targetId: key, targetTitle: `Clear Server File: ${label}`, module: "database", details: `Server file "${label}" cleared` })
      setConfirmServerStore(null)
      setServerStoreStatus({ type: "success", message: `${label} has been reset on the server.` })
    } catch (e: any) {
      setConfirmServerStore(null)
      setServerStoreStatus({ type: "error", message: `Failed to clear ${label}: ${e?.message}` })
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Database</h1>
        <p className="text-sm text-gray-500 mt-1">Backup, restore, and manage all system data — requests, tasks, feedback, and configurations</p>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
        <Shield className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800">
          <p className="font-semibold">What is included in a backup?</p>
          <p className="mt-0.5 text-blue-700">Every store the app owns is captured automatically — browser data (requests, tasks, viewed comments, company data, platform settings, logos, theme) <strong>and</strong> server-side data (comments, feedback responses, users, roles). Browser data is synced to the server on every backup so <strong>Run Backup Now</strong> and scheduled backups capture the full picture too. Backups download as one JSON file (version 1.1) and Restore writes back whatever the file contains. Old v1.0 backups (browser data only) are still accepted. <strong>Team Requests</strong> is a filtered view of the request store (no separate data) — it is covered by the All Requests backup.</p>
        </div>
      </div>

      {/* ── Backup + Restore ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Backup */}
        <Card className="border shadow-sm">
          <CardHeader className="border-b bg-gray-50 rounded-t-lg">
            <div className="flex items-center gap-3">
              <div className="bg-emerald-100 rounded-lg p-2"><Download className="h-5 w-5 text-emerald-700" /></div>
              <div>
                <CardTitle className="text-base font-semibold text-gray-900">Database Backup</CardTitle>
                <p className="text-xs text-gray-500 mt-0.5">Export a full snapshot of all system data</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "All Requests", sub: "All modules" },
                ...NON_REQUEST_STORES.map((s) => ({ label: s.label, sub: s.description })),
                { label: "Any new stores", sub: "Auto-discovered at runtime" },
                { label: "Browser Data Snapshot", sub: "data/browser-data.json — tasks, notifications, audit log, logos, theme, viewed comments (synced on every backup)" },
                { label: "Server Requests", sub: "data/requests.json — every request from every user" },
                { label: "Server Comments", sub: "data/comments.json on the server" },
                { label: "Server Feedback Responses", sub: "data/feedback.json on the server" },
                { label: "Server Company Data", sub: "data/company-data.json — suppliers, cost centers, managers, departments, sectors, carriers" },
                { label: "Users & Roles", sub: "data/users.json + data/roles.json (restored only if present in backup)" },
              ].map(({ label, sub }) => (
                <div key={label} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-gray-700">{label}</p>
                    <p className="text-xs text-gray-400 line-clamp-2">{sub}</p>
                  </div>
                </div>
              ))}
            </div>
            {lastBackupTime && (
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Clock className="h-3.5 w-3.5" />Last backup: {fmt(lastBackupTime)}
              </div>
            )}
            <Button onClick={handleBackup} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
              <Download className="h-4 w-4 mr-2" />Download Backup
            </Button>
            <StatusAlert status={backupStatus} />
          </CardContent>
        </Card>

        {/* Restore */}
        <Card className="border shadow-sm">
          <CardHeader className="border-b bg-gray-50 rounded-t-lg">
            <div className="flex items-center gap-3">
              <div className="bg-amber-100 rounded-lg p-2"><Upload className="h-5 w-5 text-amber-700" /></div>
              <div>
                <CardTitle className="text-base font-semibold text-gray-900">Restore from Backup</CardTitle>
                <p className="text-xs text-gray-500 mt-0.5">Upload a backup file to restore all data</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg px-3 py-3">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800">Restoring will overwrite all current data with the backup. This action cannot be undone. Download a fresh backup before restoring.</p>
            </div>
            <div
              className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center cursor-pointer hover:border-amber-400 hover:bg-amber-50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-600">Click to upload backup file</p>
              <p className="text-xs text-gray-400 mt-1">JSON files only (.json)</p>
            </div>
            <input ref={fileInputRef} type="file" accept=".json,application/json" className="hidden" onChange={handleRestoreFile} />
            <Button onClick={() => fileInputRef.current?.click()} disabled={restoring} className="w-full bg-amber-600 hover:bg-amber-700 text-white">
              <Upload className="h-4 w-4 mr-2" />{restoring ? "Restoring..." : "Choose Backup File"}
            </Button>
            <StatusAlert status={restoreStatus} />
          </CardContent>
        </Card>
      </div>

      {/* ── Deleted Requests (Recycle Bin) ── */}
      <Card className="border border-green-200 shadow-sm">
        <CardHeader className="border-b bg-green-50 rounded-t-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-green-100 rounded-lg p-2"><RotateCcw className="h-5 w-5 text-green-700" /></div>
              <div>
                <CardTitle className="text-base font-semibold text-green-900">Deleted Requests</CardTitle>
                <p className="text-xs text-green-600 mt-0.5">Restore accidentally deleted requests or purge them permanently — up to 200 entries kept</p>
              </div>
            </div>
            {deletedRequests.length > 0 && (
              !showPurgeAllConfirm ? (
                <Button
                  onClick={() => { setDeletedStatus({ type: "idle", message: "" }); setPurgeAllConfirmText(""); setShowPurgeAllConfirm(true) }}
                  className="bg-red-600 hover:bg-red-700 text-white text-xs"
                  size="sm"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" />Purge All ({deletedRequests.length})
                </Button>
              ) : (
                <div className="flex items-center gap-2">
                  <Button onClick={() => { setShowPurgeAllConfirm(false); setPurgeAllConfirmText("") }} variant="outline" size="sm">Cancel</Button>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={purgeAllConfirmText}
                      onChange={(e) => setPurgeAllConfirmText(e.target.value)}
                      placeholder="Type CLEAR"
                      className="w-28 px-2 py-1 text-xs font-mono text-center rounded-md border-2 border-red-300 focus:border-red-500 focus:outline-none bg-white"
                    />
                    <Button
                      onClick={handlePurgeAll}
                      disabled={purgeAllConfirmText.trim() !== "CLEAR"}
                      className="bg-red-600 hover:bg-red-700 text-white disabled:opacity-40 disabled:cursor-not-allowed"
                      size="sm"
                    >
                      Purge All
                    </Button>
                  </div>
                </div>
              )
            )}
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-4">

          {deletedRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-3 text-gray-400">
              <CheckCircle2 className="h-10 w-10 text-green-300" />
              <p className="text-sm font-medium">No deleted requests</p>
              <p className="text-xs text-gray-400">Requests you delete will appear here for recovery</p>
            </div>
          ) : (
            <div className="rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-800 text-white">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider">Request ID</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider">Title</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider">Module</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider">Status at Deletion</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider">Deleted At</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider">Deleted By</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider bg-slate-800">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {deletedRequests.map((entry, idx) => {
                    const mod = REQUEST_MODULES.find((m) => m.id === entry.request.module)
                    const isPurgingThis = confirmPurgeId === entry.request.id
                    return (
                      <tr key={entry.request.id} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50/60"}>
                        <td className="px-4 py-3 font-mono text-xs text-gray-600 whitespace-nowrap">{entry.request.id}</td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-800 max-w-[200px] truncate" title={entry.request.title}>
                          {entry.request.title}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {mod ? (
                            <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${mod.bg} ${mod.color} ${mod.border}`}>
                              <mod.icon className="h-3 w-3" />{mod.label}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">{entry.request.module}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-xs text-gray-600 capitalize">{entry.request.status.replace(/_/g, " ")}</span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{fmtDateTime(entry.deletedAt)}</td>
                        <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{entry.deletedBy}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {!isPurgingThis ? (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleRestore(entry.request.id)}
                                className="text-xs font-medium bg-green-600 hover:bg-green-700 text-white rounded-lg px-2.5 py-1.5 transition-colors"
                              >
                                Restore
                              </button>
                              <button
                                onClick={() => { setConfirmPurgeId(entry.request.id); setDeletedStatus({ type: "idle", message: "" }) }}
                                className="text-xs font-medium border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-400 rounded-lg px-2.5 py-1.5 transition-colors"
                              >
                                Purge
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-red-700 font-semibold">Permanently delete?</span>
                              <button
                                onClick={() => setConfirmPurgeId(null)}
                                className="text-xs border border-gray-300 rounded-lg px-2.5 py-1.5 bg-white hover:bg-gray-50 font-medium text-gray-600 transition-colors"
                              >
                                No
                              </button>
                              <button
                                onClick={() => handlePurgeOne(entry.request.id)}
                                className="text-xs bg-red-600 hover:bg-red-700 text-white rounded-lg px-2.5 py-1.5 font-medium transition-colors"
                              >
                                Yes, Purge
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          <StatusAlert status={deletedStatus} />
        </CardContent>
      </Card>

      {/* ── Clear Data ── */}
      <Card className="border border-red-200 shadow-sm">
        <CardHeader className="border-b bg-red-50 rounded-t-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-red-100 rounded-lg p-2"><Trash2 className="h-5 w-5 text-red-700" /></div>
              <div>
                <CardTitle className="text-base font-semibold text-red-900">Clear Data</CardTitle>
                <p className="text-xs text-red-500 mt-0.5">Permanently remove data by module or data type — user accounts are never affected</p>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-6">

          {/* Warning */}
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
            <p className="text-xs text-red-800">All clear operations are permanent and cannot be undone. <strong>Download a backup first.</strong> User accounts are not affected by any clear action.</p>
          </div>

          {/* ── Section: Clear by Module ── */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-px flex-1 bg-gray-100" />
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest px-2">Clear by Module</span>
              <div className="h-px flex-1 bg-gray-100" />
            </div>
            <p className="text-xs text-gray-500">Remove all requests for a specific module while keeping other modules untouched.</p>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {REQUEST_MODULES.map(({ id, label, icon: Icon, color, bg, border }) => {
                const count = countByModule(id)
                const isConfirming = confirmModule === id
                return (
                  <div key={id} className={`rounded-xl border-2 p-4 transition-all ${isConfirming ? "border-red-400 bg-red-50" : `${border} ${bg}`}`}>
                    <div className="flex items-center gap-2 mb-3">
                      <div className={`rounded-lg p-1.5 bg-white border ${border}`}>
                        <Icon className={`h-4 w-4 ${color}`} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{label}</p>
                        <p className="text-xs text-gray-400">{count} record{count !== 1 ? "s" : ""}</p>
                      </div>
                    </div>

                    {!isConfirming ? (
                      <button
                        onClick={() => { setConfirmModule(id); setModuleStatus({ type: "idle", message: "" }) }}
                        className="w-full flex items-center justify-between text-xs font-medium text-red-600 hover:text-red-800 border border-red-200 hover:border-red-400 rounded-lg px-3 py-2 bg-white hover:bg-red-50 transition-colors"
                      >
                        <span>Clear {label} Data</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-red-700 text-center">Delete {count} record{count !== 1 ? "s" : ""}?</p>
                        <div className="flex gap-2">
                          <button onClick={() => setConfirmModule(null)} className="flex-1 text-xs border border-gray-300 rounded-lg py-1.5 bg-white hover:bg-gray-50 font-medium text-gray-600 transition-colors">
                            Cancel
                          </button>
                          <button onClick={() => handleClearModule(id)} className="flex-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded-lg py-1.5 font-medium transition-colors">
                            Confirm
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            <StatusAlert status={moduleStatus} />
          </div>

          {/* ── Section: Clear by Data Type ── */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-px flex-1 bg-gray-100" />
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest px-2">Clear by Data Type</span>
              <div className="h-px flex-1 bg-gray-100" />
            </div>
            <p className="text-xs text-gray-500">Remove a specific data store such as notifications, feedback, or task records.</p>

            <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 overflow-hidden">
              {OTHER_STORES.map(({ key, label, description, icon: Icon, color, bg, border }) => {
                const isConfirming = confirmStore === key
                return (
                  <div key={key} className={`flex items-center gap-4 px-4 py-3.5 transition-colors ${isConfirming ? "bg-red-50" : "bg-white hover:bg-gray-50"}`}>
                    <div className={`rounded-lg p-2 ${bg} border ${border} shrink-0`}>
                      <Icon className={`h-4 w-4 ${color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800">{label}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{description}</p>
                      <p className="font-mono text-xs text-gray-300 mt-0.5">{key}</p>
                    </div>
                    <div className="shrink-0">
                      {!isConfirming ? (
                        <button
                          onClick={() => { setConfirmStore(key); setStoreStatus({ type: "idle", message: "" }) }}
                          className="flex items-center gap-1.5 text-xs font-medium text-red-600 hover:text-red-800 border border-red-200 hover:border-red-400 rounded-lg px-3 py-1.5 bg-white hover:bg-red-50 transition-colors whitespace-nowrap"
                        >
                          <Trash2 className="h-3.5 w-3.5" />Clear
                        </button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-red-700 font-semibold">Sure?</p>
                          <button onClick={() => setConfirmStore(null)} className="text-xs border border-gray-300 rounded-lg px-2.5 py-1.5 bg-white hover:bg-gray-50 font-medium text-gray-600 transition-colors">
                            No
                          </button>
                          <button onClick={() => handleClearStore(key)} className="text-xs bg-red-600 hover:bg-red-700 text-white rounded-lg px-2.5 py-1.5 font-medium transition-colors">
                            Yes, Clear
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
            <StatusAlert status={storeStatus} />
          </div>

          {/* ── Section: Clear Server Data ── */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-px flex-1 bg-gray-100" />
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest px-2">Clear Server-Side Data</span>
              <div className="h-px flex-1 bg-gray-100" />
            </div>
            <p className="text-xs text-gray-500">Reset individual server-side data files in <code className="bg-gray-100 px-1 rounded text-[11px]">/app/data/</code>. These exist on the server independently of browser storage.</p>

            <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 overflow-hidden">
              {SERVER_FILE_STORES.map(({ key, label, description, icon: Icon, color, bg, border }) => {
                const isConfirming = confirmServerStore === key
                return (
                  <div key={key} className={`flex items-center gap-4 px-4 py-3.5 transition-colors ${isConfirming ? "bg-red-50" : "bg-white hover:bg-gray-50"}`}>
                    <div className={`rounded-lg p-2 ${bg} border ${border} shrink-0`}>
                      <Icon className={`h-4 w-4 ${color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800">{label}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{description}</p>
                    </div>
                    <div className="shrink-0">
                      {!isConfirming ? (
                        <button
                          onClick={() => { setConfirmServerStore(key); setServerStoreStatus({ type: "idle", message: "" }) }}
                          className="flex items-center gap-1.5 text-xs font-medium text-red-600 hover:text-red-800 border border-red-200 hover:border-red-400 rounded-lg px-3 py-1.5 bg-white hover:bg-red-50 transition-colors whitespace-nowrap"
                        >
                          <Trash2 className="h-3.5 w-3.5" />Clear
                        </button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-red-700 font-semibold">Sure?</p>
                          <button onClick={() => setConfirmServerStore(null)} className="text-xs border border-gray-300 rounded-lg px-2.5 py-1.5 bg-white hover:bg-gray-50 font-medium text-gray-600 transition-colors">
                            No
                          </button>
                          <button onClick={() => handleClearServerStore(key)} className="text-xs bg-red-600 hover:bg-red-700 text-white rounded-lg px-2.5 py-1.5 font-medium transition-colors">
                            Yes, Clear
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
            <StatusAlert status={serverStoreStatus} />
          </div>

          {/* ── Section: Clear All ── */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-px flex-1 bg-gray-100" />
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest px-2">Clear Everything</span>
              <div className="h-px flex-1 bg-gray-100" />
            </div>

            {!showClearAllConfirm ? (
              <button
                onClick={() => { setClearAllStatus({ type: "idle", message: "" }); setClearAllConfirmText(""); setShowClearAllConfirm(true) }}
                className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white rounded-lg px-4 py-3 text-sm font-semibold transition-colors"
              >
                <Trash2 className="h-4 w-4" />Clear All Data — All Modules &amp; Stores
              </button>
            ) : (
              <div className="border-2 border-red-300 rounded-xl p-4 bg-red-50 dark:bg-red-950/20 dark:border-red-900 space-y-3">
                <p className="text-sm font-bold text-red-900 dark:text-red-200 text-center">
                  This will permanently wipe all requests, comments, feedback, and company-data lookups on the server, plus every browser cache. User accounts and roles are preserved.
                </p>
                <p className="text-xs text-red-700 dark:text-red-300 text-center">
                  Type <span className="font-mono font-bold bg-red-100 dark:bg-red-900/40 px-1.5 py-0.5 rounded">CLEAR</span> below to confirm.
                </p>
                <input
                  type="text"
                  value={clearAllConfirmText}
                  onChange={(e) => setClearAllConfirmText(e.target.value)}
                  placeholder="Type CLEAR to confirm"
                  autoFocus
                  className="w-full px-3 py-2 text-sm font-mono text-center rounded-md border-2 border-red-300 focus:border-red-500 focus:outline-none bg-white dark:bg-slate-900"
                />
                <div className="flex gap-3">
                  <Button onClick={() => { setShowClearAllConfirm(false); setClearAllConfirmText("") }} variant="outline" className="flex-1 border-gray-300">Cancel</Button>
                  <Button
                    onClick={handleClearAll}
                    disabled={clearAllConfirmText.trim() !== "CLEAR"}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />Yes, Clear Everything
                  </Button>
                </div>
              </div>
            )}
            <StatusAlert status={clearAllStatus} />
          </div>

          {/* ── Section: System Controls (Maintenance + Force sign-out) ── */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-px flex-1 bg-gray-100" />
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest px-2">System Controls</span>
              <div className="h-px flex-1 bg-gray-100" />
            </div>

            {/* Maintenance mode card */}
            <div className={`rounded-xl border-2 p-4 space-y-3 ${maintenance ? "border-amber-300 bg-amber-50/60 dark:bg-amber-950/20 dark:border-amber-900" : "border-gray-200 bg-white dark:bg-slate-900 dark:border-slate-800"}`}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${maintenance ? "bg-amber-200 text-amber-800" : "bg-amber-100 text-amber-700"}`}>
                    <Power className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">Maintenance Mode</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {maintenance
                        ? "ON — all non-admin users see a maintenance page."
                        : "OFF — the app is open to everyone."}
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => toggleMaintenance(!maintenance)}
                  className={maintenance ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-amber-600 hover:bg-amber-700 text-white"}
                >
                  {maintenance ? "Turn OFF" : "Turn ON"}
                </Button>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Message shown to users</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={maintenanceMessage}
                    onChange={(e) => setMaintenanceMessage(e.target.value)}
                    placeholder="We're doing maintenance — we'll be right back."
                    className="flex-1 px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                  <Button onClick={saveMaintenanceMessage} variant="outline" size="sm">Save message</Button>
                </div>
              </div>
              <StatusAlert status={maintenanceStatus} />
            </div>

            {/* Force sign-out card */}
            <div className="rounded-xl border-2 border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-red-100 dark:bg-red-950/30 flex items-center justify-center text-red-700 dark:text-red-300">
                    <LogOut className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">Force sign-out all users</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Invalidates every existing session. Everyone (including you) will be redirected to login on their next request.
                    </p>
                  </div>
                </div>
                {!showSignoutConfirm ? (
                  <Button onClick={() => { setSignoutStatus({ type: "idle", message: "" }); setShowSignoutConfirm(true) }} className="bg-red-600 hover:bg-red-700 text-white">
                    Sign out everyone
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button onClick={() => setShowSignoutConfirm(false)} variant="outline" size="sm">Cancel</Button>
                    <Button onClick={forceSignoutAll} className="bg-red-600 hover:bg-red-700 text-white" size="sm">Confirm</Button>
                  </div>
                )}
              </div>
              <StatusAlert status={signoutStatus} />
            </div>
          </div>

        </CardContent>
      </Card>

      {/* ── Scheduled Backups ── */}
      <Card className="border shadow-sm">
        <CardHeader className="border-b bg-gray-50 rounded-t-lg">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 rounded-lg p-2"><CalendarClock className="h-5 w-5 text-blue-700" /></div>
            <div>
              <CardTitle className="text-base font-semibold text-gray-900">Scheduled Backups</CardTitle>
              <p className="text-xs text-gray-500 mt-0.5">
                Automatic backups saved to <code className="bg-gray-100 px-1 rounded text-[11px]">~/admin-helpdesk-Backup</code> on the Ubuntu server
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-5">

          {/* Enable toggle */}
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div>
              <p className="text-sm font-semibold text-gray-800">Enable Automatic Backups</p>
              <p className="text-xs text-gray-500 mt-0.5">The server runs a background check every 5 minutes and triggers a backup when due</p>
            </div>
            <button
              type="button"
              onClick={() => setScheduleEnabled((v) => !v)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${scheduleEnabled ? "bg-blue-600" : "bg-gray-300"}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${scheduleEnabled ? "translate-x-6" : "translate-x-1"}`} />
            </button>
          </div>

          {/* Schedule config — only shown when enabled */}
          {scheduleEnabled && (
            <div className="space-y-4">
              {/* Frequency — multi-select: click to toggle each on/off */}
              <div>
                <p className="text-xs font-medium text-gray-600 mb-2">Frequency <span className="text-gray-400 font-normal">(select one or more)</span></p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {(["hourly","daily","weekly","monthly"] as const).map((f) => {
                    const active = scheduleFreqs.includes(f)
                    return (
                      <button
                        key={f}
                        onClick={() => setScheduleFreqs((prev) =>
                          active ? prev.filter((x) => x !== f) : [...prev, f]
                        )}
                        className={`rounded-lg border-2 px-4 py-3 text-sm font-medium transition-all ${active ? "bg-blue-600 border-blue-600 text-white" : "border-gray-200 bg-white text-gray-700 hover:border-blue-300"}`}
                      >
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Time (shown when any non-hourly frequency is active) */}
                {scheduleFreqs.some((f) => f !== "hourly") && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-600">Time (24h)</label>
                    <input
                      type="time"
                      value={scheduleTime}
                      onChange={(e) => setScheduleTime(e.target.value)}
                      className="h-9 w-full rounded-md border border-input bg-white px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>
                )}

                {/* Day of week (weekly only) */}
                {scheduleFreqs.includes("weekly") && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-600">Day of Week</label>
                    <select
                      value={scheduleDayOfWeek}
                      onChange={(e) => setScheduleDayOfWeek(Number(e.target.value))}
                      className="h-9 w-full rounded-md border border-input bg-white px-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      {["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"].map((d, i) => (
                        <option key={i} value={i}>{d}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Day of month (monthly only) */}
                {scheduleFreqs.includes("monthly") && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-600">Day of Month</label>
                    <select
                      value={scheduleDayOfMonth}
                      onChange={(e) => setScheduleDayOfMonth(Number(e.target.value))}
                      className="h-9 w-full rounded-md border border-input bg-white px-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Retention */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-600">Keep last N backups (0 = keep all)</label>
                  <input
                    type="number"
                    min={0}
                    max={365}
                    value={scheduleRetention}
                    onChange={(e) => setScheduleRetention(Number(e.target.value))}
                    className="h-9 w-full rounded-md border border-input bg-white px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Save schedule + Run now */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Button onClick={saveSchedule} className="bg-blue-600 hover:bg-blue-700 text-white">
              <Save className="h-4 w-4 mr-2" />Save Schedule
            </Button>
            <Button onClick={runBackupNow} disabled={runningNow} variant="outline" className="border-blue-300 text-blue-700 hover:bg-blue-50">
              {runningNow
                ? <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Running...</>
                : <><Download className="h-4 w-4 mr-2" />Run Backup Now</>}
            </Button>
          </div>
          <StatusAlert status={scheduleSaveStatus} />
          <StatusAlert status={runNowStatus} />

          {/* Last backup info */}
          {scheduleLastAt && (
            <div className="flex items-center gap-2 text-xs text-gray-500 border-t border-gray-100 pt-3">
              <Clock className="h-3.5 w-3.5 shrink-0" />
              <span>Last backup: <strong>{fmt(scheduleLastAt)}</strong></span>
              {scheduleLastFile && <span className="font-mono text-gray-400">— {scheduleLastFile}</span>}
            </div>
          )}

          {/* Backup file list */}
          {backupFiles.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <FolderOpen className="h-4 w-4 text-gray-400" />
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Saved Backup Files ({backupFiles.length})</p>
              </div>
              <div className="rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-hidden max-h-64 overflow-y-auto">
                {backupFiles.map((f) => (
                  <div key={f.filename} className="flex items-center gap-3 px-4 py-2.5 bg-white hover:bg-gray-50">
                    <Download className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-mono text-gray-700 truncate">{f.filename}</p>
                      <p className="text-xs text-gray-400">{(f.size / 1024).toFixed(1)} KB &bull; {fmt(f.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {backupFiles.length === 0 && scheduleLastAt === null && (
            <p className="text-xs text-gray-400 italic">No automated backups yet. Click "Run Backup Now" to create the first one.</p>
          )}

        </CardContent>
      </Card>
    </div>
  )
}
