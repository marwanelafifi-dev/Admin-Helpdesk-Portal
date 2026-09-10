"use client"

import { useEffect, useMemo, useState } from "react"
import { useSession } from "next-auth/react"
import { Building2, Calculator, Download, FileText, Globe, Plus, Trash2, Upload, Users, X } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { fmtDateTime } from "@/lib/utils"
import { canManageIntranetContent, type FunctionId } from "@/lib/functionRegistry"

type Owner = "company" | FunctionId

interface IntranetDocument {
  id: string
  title: string
  description?: string
  owner: Owner
  fileName: string
  sizeBytes: number
  createdAt: string
  uploadedBy: string
}

const OWNER_SECTIONS: { owner: Owner; label: string; icon: React.ElementType }[] = [
  { owner: "company", label: "Company-wide", icon: Globe },
  { owner: "admin", label: "Administration Team", icon: Building2 },
  { owner: "hr", label: "HR Team", icon: Users },
  { owner: "finance", label: "Finance Team", icon: Calculator },
]

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function DocumentLibraryPage() {
  const { data: session } = useSession()
  const role = session?.user?.role
  const intranetOwners = (session?.user as any)?.intranetOwners as Owner[] | undefined
  const [documents, setDocuments] = useState<IntranetDocument[]>([])
  const [loaded, setLoaded] = useState(false)
  const [dialogOwner, setDialogOwner] = useState<Owner | null>(null)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = () => {
    fetch("/api/intranet-documents")
      .then((r) => (r.ok ? r.json() : { data: [] }))
      .then((data) => setDocuments(Array.isArray(data.data) ? data.data : []))
      .finally(() => setLoaded(true))
  }

  useEffect(() => { load() }, [])

  const grouped = useMemo(() => {
    const map = new Map<Owner, IntranetDocument[]>()
    OWNER_SECTIONS.forEach((s) => map.set(s.owner, []))
    documents.forEach((d) => map.get(d.owner)?.push(d))
    return map
  }, [documents])

  function openAdd(owner: Owner) {
    setDialogOwner(owner)
    setTitle("")
    setDescription("")
    setFile(null)
    setError(null)
  }

  async function handleUpload() {
    if (!dialogOwner) return
    if (!title.trim() || !file) {
      setError("Title and a file are required.")
      return
    }
    setSaving(true)
    setError(null)
    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("title", title)
      formData.append("description", description)
      formData.append("owner", dialogOwner)
      const res = await fetch("/api/intranet-documents", { method: "POST", body: formData })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || "Failed to upload document")
      }
      setDialogOwner(null)
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload document")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this document? This cannot be undone.")) return
    setDocuments((prev) => prev.filter((d) => d.id !== id))
    await fetch(`/api/intranet-documents/${id}`, { method: "DELETE" }).catch(() => {})
    load()
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-emerald-600 text-white"><FileText className="h-7 w-7" /></div>
        <h1 className="mt-5 text-3xl font-bold text-slate-900 dark:text-white">Document Library</h1>
        <p className="mt-3 text-slate-600 dark:text-slate-400">Company policies, handbooks, and forms. Each team manages its own group.</p>
      </div>

      {OWNER_SECTIONS.map((section) => {
        const items = grouped.get(section.owner) ?? []
        const canManage = canManageIntranetContent(section.owner, role, intranetOwners)
        return (
          <Card key={section.owner}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="flex items-center gap-2 text-base">
                <section.icon className="h-4 w-4 text-emerald-600" /> {section.label}
              </CardTitle>
              {canManage && (
                <Button size="sm" variant="outline" onClick={() => openAdd(section.owner)}>
                  <Plus className="h-4 w-4" /> Upload Document
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {!loaded ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">Loading…</p>
              ) : items.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">No documents yet.</p>
              ) : (
                <div className="space-y-2">
                  {items.map((doc) => (
                    <div key={doc.id} className="group flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{doc.title}</p>
                        {doc.description && <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">{doc.description}</p>}
                        <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">{formatSize(doc.sizeBytes)} · {fmtDateTime(doc.createdAt)} · {doc.uploadedBy}</p>
                      </div>
                      <div className="flex flex-shrink-0 items-center gap-1">
                        <a href={`/api/intranet-documents/${doc.id}/download`} className="rounded p-1.5 text-slate-500 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-950/40" title="Download">
                          <Download className="h-4 w-4" />
                        </a>
                        {canManage && (
                          <button
                            onClick={() => handleDelete(doc.id)}
                            className="rounded p-1.5 text-slate-400 opacity-0 hover:bg-red-50 hover:text-red-600 group-hover:opacity-100 dark:hover:bg-red-950/40"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}

      <Dialog open={dialogOwner !== null} onOpenChange={(open) => !open && setDialogOwner(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="doc-title">Title</Label>
              <Input id="doc-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Employee Handbook" />
            </div>
            <div>
              <Label htmlFor="doc-description">Description (optional)</Label>
              <Input id="doc-description" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="doc-file">File</Label>
              <label className="mt-1 flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-slate-300 px-3 py-3 text-sm text-slate-500 hover:border-emerald-400 dark:border-slate-600">
                <Upload className="h-4 w-4" />
                {file ? file.name : "Click to browse files"}
                <input id="doc-file" type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              </label>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOwner(null)}><X className="h-4 w-4" /> Cancel</Button>
              <Button onClick={handleUpload} disabled={saving}>{saving ? "Uploading…" : "Upload"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
