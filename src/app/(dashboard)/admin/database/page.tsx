"use client"

import { useState, useRef } from "react"
import {
  Download, Upload, CheckCircle2, AlertTriangle, Clock, Shield, Trash2,
  Package, Wrench, ShoppingCart, CalendarDays, Plane, UserCog, ChevronRight, Inbox,
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

// Other clearable stores (non-request) — sourced from central registry so new stores
// added anywhere in the app automatically appear here.
const OTHER_STORES = NON_REQUEST_STORES

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

  // Pull the server-side data bundle (comments, feedback, users, roles) so
  // the backup is actually a full snapshot — not just the user's browser state.
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
  const [backupStatus, setBackupStatus]     = useState<Status>({ type: "idle", message: "" })
  const [restoreStatus, setRestoreStatus]   = useState<Status>({ type: "idle", message: "" })
  const [clearAllStatus, setClearAllStatus] = useState<Status>({ type: "idle", message: "" })
  const [storeStatus, setStoreStatus]       = useState<Status>({ type: "idle", message: "" })
  const [moduleStatus, setModuleStatus]     = useState<Status>({ type: "idle", message: "" })

  const [restoring, setRestoring]               = useState(false)
  const [lastBackupTime, setLastBackupTime]     = useState<string | null>(null)
  const [showClearAllConfirm, setShowClearAllConfirm] = useState(false)

  // Per-module confirm
  const [confirmModule, setConfirmModule] = useState<string | null>(null)
  // Per-store confirm
  const [confirmStore, setConfirmStore]   = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Backup ────────────────────────────────────────────────────────────────
  async function handleBackup() {
    try {
      const manifest = await collectBackup()
      const json = JSON.stringify(manifest, null, 2)
      const blob = new Blob([json], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      const filename = `admin-portal-backup-${new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-")}.json`
      a.href = url; a.download = filename; a.click()
      URL.revokeObjectURL(url)
      setLastBackupTime(new Date().toISOString())
      const localCount  = Object.keys(manifest.data ?? {}).length
      const serverCount = Object.keys(manifest.serverData ?? {}).length
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
    // Also wipe server-side user data (comments.json, feedback.json).
    // users.json / roles.json are intentionally preserved by the endpoint so
    // admins can't lock themselves out through this button.
    let serverCleared = 0
    try {
      const res = await fetch("/api/admin/server-data", { method: "DELETE" })
      if (res.ok) {
        const json = await res.json()
        serverCleared = Array.isArray(json.cleared) ? json.cleared.length : 0
      }
    } catch { /* best-effort */ }
    setShowClearAllConfirm(false)
    setClearAllStatus({
      type: "success",
      message: `All data cleared — ${cleared} browser store${cleared !== 1 ? "s" : ""}` +
               (serverCleared > 0 ? ` + ${serverCleared} server file${serverCleared !== 1 ? "s" : ""}` : "") +
               ". User accounts and roles are preserved. Refresh to see the empty state.",
    })
  }

  // ── Clear Module ──────────────────────────────────────────────────────────
  function handleClearModule(moduleId: string) {
    const removed = clearModuleRequests(moduleId)
    const label = REQUEST_MODULES.find((m) => m.id === moduleId)?.label ?? moduleId
    setConfirmModule(null)
    setModuleStatus({ type: "success", message: `${label} data cleared — ${removed} request${removed !== 1 ? "s" : ""} removed. Refresh to see the updated state.` })
  }

  // ── Clear Store ───────────────────────────────────────────────────────────
  async function handleClearStore(key: string) {
    // Feedback data lives server-side now (data/feedback.json); the other
    // stores are still browser-local. Route the call accordingly.
    if (key === "feedback_surveys" || key === "feedback_responses") {
      try {
        await fetch("/api/feedback/responses", { method: "DELETE" })
      } catch (e) {
        setStoreStatus({ type: "error", message: "Failed to clear feedback on server." })
        setConfirmStore(null)
        return
      }
    } else {
      localStorage.removeItem(key)
    }
    const label = STORE_BY_KEY[key]?.label ?? key
    setConfirmStore(null)
    setStoreStatus({ type: "success", message: `${label} cleared successfully. Refresh to see the updated state.` })
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
          <p className="mt-0.5 text-blue-700">Every store the app owns is captured automatically — browser data (requests, tasks, viewed comments, company data, platform settings, logos, theme) <strong>and</strong> server-side data (comments, feedback responses, users, roles). Backups download as one JSON file (version 1.1) and Restore writes back whatever the file contains. Old v1.0 backups (browser data only) are still accepted.</p>
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
                { label: "Server Comments", sub: "data/comments.json on the server" },
                { label: "Server Feedback Responses", sub: "data/feedback.json on the server" },
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

          {/* ── Section: Clear All ── */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-px flex-1 bg-gray-100" />
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest px-2">Clear Everything</span>
              <div className="h-px flex-1 bg-gray-100" />
            </div>

            {!showClearAllConfirm ? (
              <button
                onClick={() => { setClearAllStatus({ type: "idle", message: "" }); setShowClearAllConfirm(true) }}
                className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white rounded-lg px-4 py-3 text-sm font-semibold transition-colors"
              >
                <Trash2 className="h-4 w-4" />Clear All Data — All Modules &amp; Stores
              </button>
            ) : (
              <div className="border-2 border-red-300 rounded-xl p-4 bg-red-50 space-y-3">
                <p className="text-sm font-bold text-red-900 text-center">This will permanently wipe all requests, tasks, feedback, and notifications. Are you sure?</p>
                <div className="flex gap-3">
                  <Button onClick={() => setShowClearAllConfirm(false)} variant="outline" className="flex-1 border-gray-300">Cancel</Button>
                  <Button onClick={handleClearAll} className="flex-1 bg-red-600 hover:bg-red-700 text-white">
                    <Trash2 className="h-4 w-4 mr-2" />Yes, Clear Everything
                  </Button>
                </div>
              </div>
            )}
            <StatusAlert status={clearAllStatus} />
          </div>

        </CardContent>
      </Card>
    </div>
  )
}
