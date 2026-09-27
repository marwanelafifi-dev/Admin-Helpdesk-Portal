"use client"

import { useEffect, useState } from "react"
import { ExternalLink, MessageSquarePlus, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

type Item = {
  id: string; userName: string; userEmail: string; category: string; title: string; comment: string; status: string; createdAt: string
  attachments?: Array<{ id: string; name: string }>
  context?: { pageUrl?: string; path?: string; functionName?: string }
}
const statuses = ["new", "in_progress", "resolved", "completed", "cancelled"]
const label = (value: string) => value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase())

export default function PortalFeedbackPage() {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const load = async () => {
    setLoading(true); setError("")
    try { const response = await fetch("/api/feedback/admin-survey?mode=all"); const data = await response.json(); if (!response.ok) throw new Error(data.error || "Could not load feedback."); setItems(data.surveys || []) } catch (e) { setError(e instanceof Error ? e.message : "Could not load feedback.") } finally { setLoading(false) }
  }
  useEffect(() => { void load() }, [])
  const updateStatus = async (id: string, status: string) => {
    const response = await fetch("/api/feedback/admin-survey", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) })
    const data = await response.json(); if (!response.ok) return setError(data.error || "Could not update feedback.")
    setItems((current) => current.map((item) => item.id === id ? { ...item, status: data.survey.status } : item))
  }
  return <main className="space-y-6 p-4 sm:p-6 lg:p-8"><header className="flex flex-wrap items-start justify-between gap-4"><div><div className="mb-2 flex items-center gap-2 text-blue-600"><MessageSquarePlus className="h-5 w-5" /><span className="text-xs font-bold uppercase tracking-wider">Platform Administration</span></div><h1 className="text-2xl font-bold tracking-tight">Portal Feedback</h1><p className="mt-1 text-sm text-muted-foreground">Review ideas, usability observations, and portal issues from all users.</p></div><Button variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />Refresh</Button></header>{error && <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}{loading ? <div className="rounded-lg border p-10 text-center text-sm text-muted-foreground">Loading feedback…</div> : items.length === 0 ? <div className="rounded-lg border border-dashed p-12 text-center"><MessageSquarePlus className="mx-auto h-9 w-9 text-muted-foreground" /><h2 className="mt-3 font-semibold">No portal feedback yet</h2><p className="mt-1 text-sm text-muted-foreground">New submissions from the landing page and portal toolbar will appear here.</p></div> : <div className="grid gap-4">{items.map((item) => <article key={item.id} className="rounded-xl border bg-card p-5 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-4"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-950/40 dark:text-blue-200">{label(item.category)}</span><span className="font-mono text-xs text-muted-foreground">{item.id}</span></div><h2 className="mt-3 text-lg font-semibold">{item.title}</h2><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{item.comment}</p></div><select aria-label={`Status for ${item.title}`} value={item.status} onChange={(event) => void updateStatus(item.id, event.target.value)} className="h-9 rounded-md border bg-background px-2 text-sm font-medium">{statuses.map((status) => <option key={status} value={status}>{label(status)}</option>)}</select></div><div className="mt-4 grid gap-2 border-t pt-3 text-xs text-muted-foreground sm:grid-cols-3"><span>From: <b className="text-foreground">{item.userName}</b> ({item.userEmail})</span><span>Submitted: <b className="text-foreground">{new Date(item.createdAt).toLocaleString()}</b></span><span>Area: <b className="text-foreground">{item.context?.functionName || "Portal"}</b></span></div>{item.context?.path && <p className="mt-2 text-xs text-muted-foreground">Page: <span className="font-mono">{item.context.path}</span></p>}{item.attachments && item.attachments.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{item.attachments.map((attachment) => <a key={attachment.id} className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-50" href={`/api/feedback/admin-survey/attachments/${item.id}--${attachment.id}`} target="_blank" rel="noreferrer"><ExternalLink className="h-3.5 w-3.5" />{attachment.name}</a>)}</div>}</article>)}</div>}</main>
}
