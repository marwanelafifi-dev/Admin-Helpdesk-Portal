"use client"

import { useState, useRef } from "react"
import { Database, Download, Upload, CheckCircle2, AlertTriangle, Clock, Shield, Trash2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

const LS_KEYS = [
  "arp_requests",
  "arp_notifications",
  "arp_viewed_comments",
  "feedback_surveys",
  "feedback_responses",
  "admin_tasks",
  "arp_prod_wipe_v1",
  "arp_mock_version",
]

// Keys to wipe when clearing all data (excludes user-related keys)
const CLEAR_KEYS = [
  "arp_requests",
  "arp_notifications",
  "arp_viewed_comments",
  "feedback_surveys",
  "feedback_responses",
  "admin_tasks",
  "arp_prod_wipe_v1",
  "arp_mock_version",
]

interface BackupManifest {
  version: "1.0"
  createdAt: string
  createdBy: string
  data: Record<string, unknown>
}

function collectBackup(): BackupManifest {
  const data: Record<string, unknown> = {}
  LS_KEYS.forEach((key) => {
    const raw = localStorage.getItem(key)
    if (raw) {
      try { data[key] = JSON.parse(raw) }
      catch { data[key] = raw }
    }
  })
  return {
    version: "1.0",
    createdAt: new Date().toISOString(),
    createdBy: "admin",
    data,
  }
}

function restoreBackup(manifest: BackupManifest): { restored: string[]; skipped: string[] } {
  const restored: string[] = []
  const skipped: string[] = []
  Object.entries(manifest.data).forEach(([key, value]) => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
      restored.push(key)
    } catch {
      skipped.push(key)
    }
  })
  return { restored, skipped }
}

function fmt(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  })
}

type Status = { type: "success" | "error" | "idle"; message: string }

export default function DatabasePage() {
  const [backupStatus, setBackupStatus] = useState<Status>({ type: "idle", message: "" })
  const [restoreStatus, setRestoreStatus] = useState<Status>({ type: "idle", message: "" })
  const [clearStatus, setClearStatus] = useState<Status>({ type: "idle", message: "" })
  const [restoring, setRestoring] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [lastBackupTime, setLastBackupTime] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleBackup() {
    try {
      const manifest = collectBackup()
      const json = JSON.stringify(manifest, null, 2)
      const blob = new Blob([json], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      const filename = `admin-portal-backup-${new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-")}.json`
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
      const now = new Date().toISOString()
      setLastBackupTime(now)
      const keyCount = Object.keys(manifest.data).length
      setBackupStatus({ type: "success", message: `Backup created successfully — ${keyCount} data stores exported (${filename})` })
    } catch (e: any) {
      setBackupStatus({ type: "error", message: `Backup failed: ${e?.message ?? "Unknown error"}` })
    }
  }

  function handleRestoreFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setRestoring(true)
    setRestoreStatus({ type: "idle", message: "" })

    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const manifest: BackupManifest = JSON.parse(ev.target?.result as string)
        if (manifest.version !== "1.0" || !manifest.data) {
          throw new Error("Invalid backup file format")
        }
        const { restored, skipped } = restoreBackup(manifest)
        setRestoreStatus({
          type: "success",
          message: `Restore complete — ${restored.length} stores restored from backup created on ${fmt(manifest.createdAt)}${skipped.length ? `. ${skipped.length} skipped.` : ""}. Refresh the page to see restored data.`,
        })
      } catch (err: any) {
        setRestoreStatus({ type: "error", message: `Restore failed: ${err?.message ?? "Invalid file"}` })
      } finally {
        setRestoring(false)
        // reset file input so same file can be selected again
        if (fileInputRef.current) fileInputRef.current.value = ""
      }
    }
    reader.readAsText(file)
  }

  function handleClearData() {
    CLEAR_KEYS.forEach((key) => localStorage.removeItem(key))
    setShowClearConfirm(false)
    setClearStatus({ type: "success", message: `All data cleared successfully — ${CLEAR_KEYS.length} stores wiped. Users are preserved. Refresh the page to see the empty state.` })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Database</h1>
        <p className="text-sm text-gray-500 mt-1">Backup and restore all system data — requests, users, tasks, feedback, and configurations</p>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
        <Shield className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800">
          <p className="font-semibold">What is included in a backup?</p>
          <p className="mt-0.5 text-blue-700">All requests, status histories, comments, tasks, feedback surveys &amp; responses, notifications, and system configuration. Backups are downloaded as a single JSON file to your device.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Backup Card */}
        <Card className="border shadow-sm">
          <CardHeader className="border-b bg-gray-50 rounded-t-lg">
            <div className="flex items-center gap-3">
              <div className="bg-emerald-100 rounded-lg p-2">
                <Download className="h-5 w-5 text-emerald-700" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold text-gray-900">Database Backup</CardTitle>
                <p className="text-xs text-gray-500 mt-0.5">Export a full snapshot of all system data</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-5">
            <div className="space-y-2 text-sm text-gray-600">
              {LS_KEYS.filter(k => !k.includes("version") && !k.includes("wipe")).map((key) => (
                <div key={key} className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span className="font-mono text-xs text-gray-500">{key}</span>
                </div>
              ))}
            </div>

            {lastBackupTime && (
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Clock className="h-3.5 w-3.5" />
                Last backup: {fmt(lastBackupTime)}
              </div>
            )}

            <Button onClick={handleBackup} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
              <Download className="h-4 w-4 mr-2" />
              Download Backup
            </Button>

            {backupStatus.type !== "idle" && (
              <div className={`flex items-start gap-2 rounded-lg px-3 py-2.5 text-sm ${backupStatus.type === "success" ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-red-50 text-red-800 border border-red-200"}`}>
                {backupStatus.type === "success"
                  ? <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                  : <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />}
                <span>{backupStatus.message}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Restore Card */}
        <Card className="border shadow-sm">
          <CardHeader className="border-b bg-gray-50 rounded-t-lg">
            <div className="flex items-center gap-3">
              <div className="bg-amber-100 rounded-lg p-2">
                <Upload className="h-5 w-5 text-amber-700" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold text-gray-900">Restore from Backup</CardTitle>
                <p className="text-xs text-gray-500 mt-0.5">Upload a backup file to restore all data</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-5">
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg px-3 py-3">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800">Restoring will overwrite all current data with the backup. This action cannot be undone. Take a fresh backup before restoring.</p>
            </div>

            <div
              className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-600">Click to upload backup file</p>
              <p className="text-xs text-gray-400 mt-1">JSON files only (.json)</p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={handleRestoreFile}
            />

            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={restoring}
              className="w-full bg-amber-600 hover:bg-amber-700 text-white"
            >
              <Upload className="h-4 w-4 mr-2" />
              {restoring ? "Restoring..." : "Choose Backup File"}
            </Button>

            {restoreStatus.type !== "idle" && (
              <div className={`flex items-start gap-2 rounded-lg px-3 py-2.5 text-sm ${restoreStatus.type === "success" ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-red-50 text-red-800 border border-red-200"}`}>
                {restoreStatus.type === "success"
                  ? <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                  : <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />}
                <span>{restoreStatus.message}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Clear All Data Card */}
      <Card className="border border-red-200 shadow-sm">
        <CardHeader className="border-b bg-red-50 rounded-t-lg">
          <div className="flex items-center gap-3">
            <div className="bg-red-100 rounded-lg p-2">
              <Trash2 className="h-5 w-5 text-red-700" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold text-red-900">Clear All Data</CardTitle>
              <p className="text-xs text-red-600 mt-0.5">Permanently delete all requests, tasks, feedback, and notifications — users are preserved</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-5">
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg px-3 py-3">
            <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
            <p className="text-xs text-red-800">This will permanently delete all requests, notifications, comments, tasks, feedback surveys &amp; responses. <strong>User accounts are not affected.</strong> This action cannot be undone — download a backup first.</p>
          </div>

          <div className="space-y-1.5 text-sm text-gray-600">
            {CLEAR_KEYS.filter(k => !k.includes("version") && !k.includes("wipe")).map((key) => (
              <div key={key} className="flex items-center gap-2">
                <Trash2 className="h-3.5 w-3.5 text-red-400 shrink-0" />
                <span className="font-mono text-xs text-gray-500">{key}</span>
              </div>
            ))}
          </div>

          {!showClearConfirm ? (
            <Button
              onClick={() => { setClearStatus({ type: "idle", message: "" }); setShowClearConfirm(true) }}
              className="w-full bg-red-600 hover:bg-red-700 text-white"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear All Data
            </Button>
          ) : (
            <div className="space-y-3 border border-red-300 rounded-lg p-4 bg-red-50">
              <p className="text-sm font-semibold text-red-900 text-center">Are you sure? This cannot be undone.</p>
              <div className="flex gap-3">
                <Button
                  onClick={() => setShowClearConfirm(false)}
                  variant="outline"
                  className="flex-1 border-gray-300"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleClearData}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Yes, Clear Everything
                </Button>
              </div>
            </div>
          )}

          {clearStatus.type !== "idle" && (
            <div className={`flex items-start gap-2 rounded-lg px-3 py-2.5 text-sm ${clearStatus.type === "success" ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-red-50 text-red-800 border border-red-200"}`}>
              {clearStatus.type === "success"
                ? <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                : <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />}
              <span>{clearStatus.message}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
