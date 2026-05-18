"use client"

import { useState, useRef } from "react"
import {
  Download, Upload, CheckCircle2, AlertTriangle, Clock, Shield, Trash2,
  Package, Wrench, ShoppingCart, CalendarDays, Plane, UserCog, Bell, MessageSquare, ListTodo, ChevronRight,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

// ── Types ────────────────────────────────────────────────────────────────────

interface BackupManifest {
  version: "1.0"
  createdAt: string
  createdBy: string
  data: Record<string, unknown>
}

type Status = { type: "success" | "error" | "idle"; message: string }

// ── Constants ────────────────────────────────────────────────────────────────

const SYSTEM_KEYS = ["arp_prod_wipe_v1", "arp_mock_version"]

const ALL_BACKUP_KEYS = [
  "arp_requests", "arp_viewed_comments", "arp_notifications",
  "arp_notification_preferences", "feedback_surveys", "feedback_responses",
  "admin_tasks", ...SYSTEM_KEYS,
]

// Module definitions — each maps to a filter on arp_requests[].module
const REQUEST_MODULES = [
  { id: "shipping",    label: "Shipping",    icon: Package,       color: "text-blue-600",   bg: "bg-blue-50",   border: "border-blue-200" },
  { id: "maintenance", label: "Maintenance", icon: Wrench,        color: "text-orange-600", bg: "bg-orange-50", border: "border-orange-200" },
  { id: "purchase",    label: "Purchase",    icon: ShoppingCart,  color: "text-purple-600", bg: "bg-purple-50", border: "border-purple-200" },
  { id: "event",       label: "Event",       icon: CalendarDays,  color: "text-pink-600",   bg: "bg-pink-50",   border: "border-pink-200" },
  { id: "travel",      label: "Travel",      icon: Plane,         color: "text-cyan-600",   bg: "bg-cyan-50",   border: "border-cyan-200" },
  { id: "hr",          label: "HR",          icon: UserCog,       color: "text-teal-600",   bg: "bg-teal-50",   border: "border-teal-200" },
] as const

// Other clearable stores (non-request)
const OTHER_STORES = [
  { key: "arp_notifications",            label: "Notifications",           description: "In-app notification log",                   icon: Bell,           color: "text-amber-600",  bg: "bg-amber-50",  border: "border-amber-200" },
  { key: "arp_notification_preferences", label: "Notification Preferences",description: "Per-user email & in-app toggle settings",   icon: Bell,           color: "text-amber-600",  bg: "bg-amber-50",  border: "border-amber-200" },
  { key: "arp_viewed_comments",          label: "Viewed Comments",         description: "Read/unread comment tracking per user",     icon: MessageSquare,  color: "text-slate-600",  bg: "bg-slate-50",  border: "border-slate-200" },
  { key: "feedback_surveys",             label: "Feedback Surveys",        description: "Pending and sent employee survey records",  icon: MessageSquare,  color: "text-emerald-600",bg: "bg-emerald-50",border: "border-emerald-200" },
  { key: "feedback_responses",           label: "Feedback Responses",      description: "Submitted star ratings and comments",       icon: MessageSquare,  color: "text-emerald-600",bg: "bg-emerald-50",border: "border-emerald-200" },
  { key: "admin_tasks",                  label: "Team Tasks",              description: "Task records, comments, and activity logs", icon: ListTodo,       color: "text-indigo-600", bg: "bg-indigo-50", border: "border-indigo-200" },
]

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

function collectBackup(): BackupManifest {
  const data: Record<string, unknown> = {}
  ALL_BACKUP_KEYS.forEach((key) => {
    const raw = localStorage.getItem(key)
    if (raw) { try { data[key] = JSON.parse(raw) } catch { data[key] = raw } }
  })
  return { version: "1.0", createdAt: new Date().toISOString(), createdBy: "admin", data }
}

function restoreBackup(manifest: BackupManifest) {
  const restored: string[] = []
  const skipped: string[] = []
  Object.entries(manifest.data).forEach(([key, value]) => {
    try { localStorage.setItem(key, JSON.stringify(value)); restored.push(key) }
    catch { skipped.push(key) }
  })
  return { restored, skipped }
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
  function handleBackup() {
    try {
      const manifest = collectBackup()
      const json = JSON.stringify(manifest, null, 2)
      const blob = new Blob([json], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      const filename = `admin-portal-backup-${new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-")}.json`
      a.href = url; a.download = filename; a.click()
      URL.revokeObjectURL(url)
      setLastBackupTime(new Date().toISOString())
      setBackupStatus({ type: "success", message: `Backup downloaded — ${Object.keys(manifest.data).length} stores exported as ${filename}` })
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
    reader.onload = (ev) => {
      try {
        const manifest: BackupManifest = JSON.parse(ev.target?.result as string)
        if (manifest.version !== "1.0" || !manifest.data) throw new Error("Invalid backup file format")
        const { restored, skipped } = restoreBackup(manifest)
        setRestoreStatus({ type: "success", message: `Restore complete — ${restored.length} stores restored from ${fmt(manifest.createdAt)}${skipped.length ? `. ${skipped.length} skipped.` : ""}. Refresh to see restored data.` })
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
  function handleClearAll() {
    ALL_BACKUP_KEYS.forEach((key) => localStorage.removeItem(key))
    setShowClearAllConfirm(false)
    setClearAllStatus({ type: "success", message: "All data cleared. User accounts are preserved. Refresh to see the empty state." })
  }

  // ── Clear Module ──────────────────────────────────────────────────────────
  function handleClearModule(moduleId: string) {
    const removed = clearModuleRequests(moduleId)
    const label = REQUEST_MODULES.find((m) => m.id === moduleId)?.label ?? moduleId
    setConfirmModule(null)
    setModuleStatus({ type: "success", message: `${label} data cleared — ${removed} request${removed !== 1 ? "s" : ""} removed. Refresh to see the updated state.` })
  }

  // ── Clear Store ───────────────────────────────────────────────────────────
  function handleClearStore(key: string) {
    localStorage.removeItem(key)
    const label = OTHER_STORES.find((s) => s.key === key)?.label ?? key
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
          <p className="mt-0.5 text-blue-700">All requests, status histories, comments, tasks, feedback surveys &amp; responses, notifications, and system configuration. Backups are downloaded as a single JSON file to your device.</p>
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
                { label: "All Requests", sub: "All 6 modules" },
                { label: "Team Tasks", sub: "Comments & activity" },
                { label: "Feedback", sub: "Surveys & responses" },
                { label: "Notifications", sub: "Log & preferences" },
                { label: "Viewed Comments", sub: "Read state tracking" },
                { label: "System Config", sub: "Version markers" },
              ].map(({ label, sub }) => (
                <div key={label} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-gray-700">{label}</p>
                    <p className="text-xs text-gray-400">{sub}</p>
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
