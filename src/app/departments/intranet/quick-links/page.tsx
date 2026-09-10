"use client"

import { useEffect, useMemo, useState } from "react"
import { useSession } from "next-auth/react"
import { Building2, Calculator, Globe, Link2, Plus, Trash2, Users, X } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { canManageIntranetContent, type FunctionId } from "@/lib/functionRegistry"

type Owner = "company" | FunctionId

interface QuickLink {
  id: string
  title: string
  description?: string
  url: string
  owner: Owner
  createdBy: string
  createdAt: string
}

const OWNER_SECTIONS: { owner: Owner; label: string; icon: React.ElementType }[] = [
  { owner: "company", label: "Company-wide", icon: Globe },
  { owner: "admin", label: "Administration Team", icon: Building2 },
  { owner: "hr", label: "HR Team", icon: Users },
  { owner: "finance", label: "Finance Team", icon: Calculator },
]

export default function QuickLinksPage() {
  const { data: session } = useSession()
  const role = session?.user?.role
  const intranetOwners = (session?.user as any)?.intranetOwners as Owner[] | undefined
  const [links, setLinks] = useState<QuickLink[]>([])
  const [loaded, setLoaded] = useState(false)
  const [dialogOwner, setDialogOwner] = useState<Owner | null>(null)
  const [title, setTitle] = useState("")
  const [url, setUrl] = useState("")
  const [description, setDescription] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = () => {
    fetch("/api/quick-links")
      .then((r) => (r.ok ? r.json() : { data: [] }))
      .then((data) => setLinks(Array.isArray(data.data) ? data.data : []))
      .finally(() => setLoaded(true))
  }

  useEffect(() => { load() }, [])

  const grouped = useMemo(() => {
    const map = new Map<Owner, QuickLink[]>()
    OWNER_SECTIONS.forEach((s) => map.set(s.owner, []))
    links.forEach((l) => map.get(l.owner)?.push(l))
    return map
  }, [links])

  function openAdd(owner: Owner) {
    setDialogOwner(owner)
    setTitle("")
    setUrl("")
    setDescription("")
    setError(null)
  }

  async function handleSave() {
    if (!dialogOwner) return
    if (!title.trim() || !url.trim()) {
      setError("Title and URL are required.")
      return
    }
    setSaving(true)
    setError(null)
    try {
      const res = await fetch("/api/quick-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, url, description, owner: dialogOwner }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || "Failed to create link")
      }
      setDialogOwner(null)
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create link")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    setLinks((prev) => prev.filter((l) => l.id !== id))
    await fetch(`/api/quick-links/${id}`, { method: "DELETE" }).catch(() => {})
    load()
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-emerald-600 text-white"><Link2 className="h-7 w-7" /></div>
        <h1 className="mt-5 text-3xl font-bold text-slate-900 dark:text-white">Quick Links</h1>
        <p className="mt-3 text-slate-600 dark:text-slate-400">Links to internal tools, external systems, and policies. Each team manages its own group.</p>
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
                  <Plus className="h-4 w-4" /> Add Link
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {!loaded ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">Loading…</p>
              ) : items.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">No links yet.</p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {items.map((link) => (
                    <div key={link.id} className="group flex items-start justify-between gap-2 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                      <a href={link.url} target="_blank" rel="noreferrer" className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-900 hover:underline dark:text-white">{link.title}</p>
                        {link.description && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{link.description}</p>}
                      </a>
                      {canManage && (
                        <button
                          onClick={() => handleDelete(link.id)}
                          className="flex-shrink-0 rounded p-1 text-slate-400 opacity-0 hover:bg-red-50 hover:text-red-600 group-hover:opacity-100 dark:hover:bg-red-950/40"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
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
            <DialogTitle>Add Quick Link</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="link-title">Title</Label>
              <Input id="link-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. IT Service Desk" />
            </div>
            <div>
              <Label htmlFor="link-url">URL</Label>
              <Input id="link-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
            </div>
            <div>
              <Label htmlFor="link-description">Description (optional)</Label>
              <Input id="link-description" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOwner(null)}><X className="h-4 w-4" /> Cancel</Button>
              <Button onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Save Link"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
