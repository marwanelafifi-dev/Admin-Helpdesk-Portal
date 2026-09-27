"use client"

import { useEffect, useState } from "react"
import { Bug, Edit3, Plus, Save, Sparkles, Trash2, Wrench } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

type NoticeType = "feature" | "bug_fix" | "update"
type NoticeScope = "whole_app" | "administration" | "finance" | "people" | "it"
type Notice = { id: string; title: string; type: NoticeType; scope: NoticeScope; summary: string; description?: string; postedAt: string }
type NoticeForm = Omit<Notice, "id" | "postedAt">

const emptyForm: NoticeForm = { title: "", type: "feature", scope: "whole_app", summary: "", description: "" }
const scopes: Array<{ value: NoticeScope; label: string }> = [
  { value: "whole_app", label: "Whole App Update" },
  { value: "administration", label: "Administration Team" },
  { value: "finance", label: "Finance Team" },
  { value: "people", label: "People Team" },
  { value: "it", label: "IT Team" },
]
const types: Record<NoticeType, { label: string; icon: typeof Sparkles; className: string }> = {
  feature: { label: "New feature", icon: Sparkles, className: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-200" },
  bug_fix: { label: "Improvement", icon: Bug, className: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200" },
  update: { label: "Update", icon: Wrench, className: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-200" },
}

export function PortalUpdatesManager() {
  const [notices, setNotices] = useState<Notice[]>([])
  const [form, setForm] = useState<NoticeForm>(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  const load = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/admin/notices")
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Could not load releases.")
      setNotices(Array.isArray(data.data) ? data.data : [])
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load releases.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const resetForm = () => { setForm(emptyForm); setEditingId(null); setShowForm(false) }
  const beginEdit = (notice: Notice) => {
    setForm({ title: notice.title, type: notice.type, scope: notice.scope || "whole_app", summary: notice.summary, description: notice.description || "" })
    setEditingId(notice.id)
    setError("")
    setShowForm(true)
  }

  const save = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(""); setMessage("")
    if (!form.title.trim() || !form.summary.trim()) return setError("A title and short summary are required.")
    setSaving(true)
    try {
      const response = await fetch("/api/admin/notices", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingId ? { id: editingId, ...form } : form),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Could not save the release.")
      setMessage(editingId ? "Release updated. It is now visible in What’s New." : "Release published to What’s New.")
      resetForm()
      await load()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save the release.")
    } finally {
      setSaving(false)
    }
  }

  const remove = async (notice: Notice) => {
    if (!window.confirm(`Delete “${notice.title}”? This cannot be undone.`)) return
    setError(""); setMessage("")
    try {
      const response = await fetch(`/api/admin/notices?id=${encodeURIComponent(notice.id)}`, { method: "DELETE" })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Could not delete the release.")
      setMessage("Release removed from What’s New.")
      await load()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not delete the release.")
    }
  }

  return <main className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6 lg:p-8">
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <div className="mb-2 flex items-center gap-2 text-blue-600"><Sparkles className="h-5 w-5" /><span className="text-xs font-bold uppercase tracking-wider">Platform Administration</span></div>
        <h1 className="text-2xl font-bold tracking-tight">What’s New & Releases</h1>
        <p className="mt-1 text-sm text-muted-foreground">Publish, edit, and remove the updates users see in the Portal.</p>
      </div>
      <Button onClick={() => { setError(""); setMessage(""); setForm(emptyForm); setEditingId(null); setShowForm(true) }}><Plus className="h-4 w-4" />New release</Button>
    </header>

    {message && <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200">{message}</p>}
    {error && <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/30 dark:text-red-200">{error}</p>}

    {showForm && <section className="rounded-2xl border bg-card shadow-sm"><div className="border-b bg-muted/35 px-5 py-4"><h2 className="font-semibold">{editingId ? "Edit release" : "Publish a release"}</h2><p className="mt-1 text-sm text-muted-foreground">Use the label to show whether this affects the whole Portal or a specific team.</p></div><form onSubmit={save} className="space-y-5 p-5"><div className="grid gap-5 sm:grid-cols-2"><label className="space-y-1.5 text-sm font-medium">Release type<select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as NoticeType })} className="h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="feature">New feature</option><option value="bug_fix">Improvement / fix</option><option value="update">Update</option></select></label><label className="space-y-1.5 text-sm font-medium">Update label<select value={form.scope} onChange={(event) => setForm({ ...form, scope: event.target.value as NoticeScope })} className="h-10 w-full rounded-md border bg-background px-3 text-sm">{scopes.map((scope) => <option key={scope.value} value={scope.value}>{scope.label}</option>)}</select></label></div><label className="block space-y-1.5 text-sm font-medium">Title<Input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} maxLength={100} placeholder="Example: Finance services are now available" /></label><label className="block space-y-1.5 text-sm font-medium">Short summary<Input value={form.summary} onChange={(event) => setForm({ ...form, summary: event.target.value })} maxLength={200} placeholder="A short sentence users see at a glance" /></label><label className="block space-y-1.5 text-sm font-medium">Full description <span className="font-normal text-muted-foreground">(optional)</span><Textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} maxLength={5000} rows={7} placeholder="Describe what changed, who it helps, and any key steps." /></label><div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={resetForm}>Cancel</Button><Button type="submit" disabled={saving}><Save className="h-4 w-4" />{saving ? "Saving…" : editingId ? "Save changes" : "Publish release"}</Button></div></form></section>}

    <section className="overflow-hidden rounded-2xl border bg-card shadow-sm"><div className="border-b px-5 py-4"><h2 className="font-semibold">Published releases</h2><p className="mt-1 text-sm text-muted-foreground">These appear in the landing page’s What’s New window.</p></div>{loading ? <p className="p-10 text-center text-sm text-muted-foreground">Loading releases…</p> : notices.length === 0 ? <p className="p-10 text-center text-sm text-muted-foreground">No releases have been published yet.</p> : <div className="divide-y">{notices.map((notice) => { const style = types[notice.type] || types.update; const Icon = style.icon; return <article key={notice.id} className="flex flex-wrap items-start justify-between gap-4 p-5"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${style.className}`}><Icon className="h-3.5 w-3.5" />{style.label}</span><span className="rounded-full border px-2.5 py-1 text-xs font-medium text-muted-foreground">{scopes.find((scope) => scope.value === (notice.scope || "whole_app"))?.label || "Whole App Update"}</span><time className="text-xs text-muted-foreground">{new Date(notice.postedAt).toLocaleDateString()}</time></div><h3 className="mt-3 font-semibold">{notice.title}</h3><p className="mt-1 text-sm text-muted-foreground">{notice.summary}</p></div><div className="flex shrink-0 gap-1"><Button variant="ghost" size="icon" title="Edit release" onClick={() => beginEdit(notice)}><Edit3 className="h-4 w-4" /></Button><Button variant="ghost" size="icon" title="Delete release" className="text-destructive hover:text-destructive" onClick={() => void remove(notice)}><Trash2 className="h-4 w-4" /></Button></div></article> })}</div>}</section>
  </main>
}
