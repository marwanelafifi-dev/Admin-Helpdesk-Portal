"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Bug, ChevronRight, Sparkles, Wrench } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

type Notice = { id: string; title: string; type: "feature" | "bug_fix" | "update"; scope?: "whole_app" | "administration" | "finance" | "people" | "it"; summary: string; description?: string; postedAt: string; postedBy?: string }

const scopeLabel = (scope?: Notice["scope"]) => ({ whole_app: "Whole App Update", administration: "Administration Team", finance: "Finance Team", people: "People Team", it: "IT Team" }[scope || "whole_app"])

const typeStyle = {
  feature: { label: "New feature", icon: Sparkles, className: "text-blue-700 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-200" },
  bug_fix: { label: "Improvement", icon: Bug, className: "text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-200" },
  update: { label: "Update", icon: Wrench, className: "text-amber-700 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-200" },
}

export function PortalUpdatesCard() {
  const [notices, setNotices] = useState<Notice[]>([])
  useEffect(() => { fetch("/api/notices").then((response) => response.ok ? response.json() : { data: [] }).then((data) => setNotices(Array.isArray(data.data) ? data.data.slice(0, 3) : [])).catch(() => setNotices([])) }, [])
  if (!notices.length) return null
  return <section className="rounded-[24px] border border-blue-100 bg-white/80 p-4 shadow-sm dark:border-[#29436b] dark:bg-[#101d33]/90 sm:p-5" aria-labelledby="portal-updates-heading"><div className="mb-4 flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#173f91] text-white"><Sparkles className="h-5 w-5" /></span><div><h2 id="portal-updates-heading" className="text-lg font-semibold text-slate-950 dark:text-white">What’s new in the portal</h2><p className="text-xs text-slate-500 dark:text-slate-300">New releases, improvements, and fixes.</p></div></div><div className="grid gap-3 md:grid-cols-3">{notices.map((notice) => { const style = typeStyle[notice.type] || typeStyle.update; const Icon = style.icon; return <article key={notice.id} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-[#405372] dark:bg-[#18263b]"><span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-bold ${style.className}`}><Icon className="h-3 w-3" />{style.label}</span><h3 className="mt-3 text-sm font-semibold text-slate-900 dark:text-white">{notice.title}</h3><p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-600 dark:text-slate-300">{notice.summary}</p><time className="mt-3 block text-[11px] text-slate-400">{new Date(notice.postedAt).toLocaleDateString()}</time></article> })}</div></section>
}

export function PortalUpdatesSupportCard() {
  const [notices, setNotices] = useState<Notice[]>([])
  const [open, setOpen] = useState(false)
  useEffect(() => { fetch("/api/notices").then((response) => response.ok ? response.json() : { data: [] }).then((data) => setNotices(Array.isArray(data.data) ? data.data : [])).catch(() => setNotices([])) }, [])
  return <><button type="button" onClick={() => setOpen(true)} className="landing-support-card group relative flex min-h-[194px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition duration-200 before:absolute before:inset-x-0 before:top-0 before:h-0.5 before:bg-[#263d8b] hover:-translate-y-1 hover:border-cyan-300 hover:shadow-lg hover:shadow-blue-950/5 dark:border-[#405372] dark:!bg-[#18263b] dark:hover:border-cyan-400 dark:hover:shadow-cyan-950/30"><div className="flex items-start justify-between gap-4"><span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-blue-200 bg-blue-50 text-[#263d8b] shadow-sm dark:border-blue-800 dark:bg-blue-950/60 dark:text-cyan-200"><Sparkles className="h-5 w-5" /></span><span className="rounded-full bg-[#eef3ff] px-3 py-1 text-xs font-bold text-[#263d8b] dark:bg-blue-950/60 dark:text-blue-200">{notices.length} update{notices.length === 1 ? "" : "s"}</span></div><h3 className="mt-4 text-[17px] font-semibold leading-6 tracking-[-0.015em] text-slate-900 dark:text-white">What’s New</h3><p className="mt-1.5 text-sm leading-5 text-slate-600 dark:text-slate-300">See new features, releases, improvements, and fixes in the portal.</p><div className="mt-auto flex items-center pt-4 text-sm font-bold text-blue-600 dark:text-cyan-300">View updates <ChevronRight className="ml-1 h-4 w-4" /></div></button><Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[86vh] max-w-3xl overflow-y-auto border-slate-200 bg-background p-0 dark:border-slate-700"><div className="border-b border-blue-100 bg-gradient-to-r from-[#173f91] to-[#2563d8] px-6 py-5 text-white dark:border-blue-900"><DialogHeader className="space-y-1 text-left"><div className="flex items-center gap-2 text-blue-100"><Sparkles className="h-5 w-5" /><span className="text-xs font-bold uppercase tracking-[0.14em]">Si-Ware Portal</span></div><DialogTitle className="text-xl text-white">What’s new</DialogTitle><DialogDescription className="text-blue-100">New releases, features, improvements, and fixes for the portal.</DialogDescription></DialogHeader></div><div className="space-y-3 p-6">{notices.length === 0 ? <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">There are no updates to share yet.</p> : notices.map((notice) => { const style = typeStyle[notice.type] || typeStyle.update; const Icon = style.icon; return <article key={notice.id} className="rounded-xl border p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-bold ${style.className}`}><Icon className="h-3 w-3" />{style.label}</span><h3 className="mt-2 text-base font-semibold">{notice.title}</h3></div><time className="text-xs text-muted-foreground">{new Date(notice.postedAt).toLocaleDateString()}</time></div><p className="mt-2 whitespace-pre-line text-sm leading-6 text-muted-foreground">{notice.description || notice.summary}</p></article> })}</div></DialogContent></Dialog></>
}

export function PortalUpdatesIcon() {
  const [notices, setNotices] = useState<Notice[]>([])
  const [open, setOpen] = useState(false)
  const { data: session } = useSession()
  useEffect(() => { fetch("/api/notices").then((response) => response.ok ? response.json() : { data: [] }).then((data) => setNotices(Array.isArray(data.data) ? data.data : [])).catch(() => setNotices([])) }, [])
  useEffect(() => {
    const email = session?.user?.email?.toLowerCase()
    if (!email || notices.length === 0) return
    const key = `arp_seen_published_portal_updates_${email}`
    const publishedByAdmin = notices.filter((notice) => notice.postedBy && notice.postedBy !== "System")
    try {
      const seen = new Set<string>(JSON.parse(localStorage.getItem(key) || "[]"))
      const unseen = publishedByAdmin.filter((notice) => !seen.has(notice.id))
      if (unseen.length > 0) {
        localStorage.setItem(key, JSON.stringify([...seen, ...unseen.map((notice) => notice.id)]))
        setOpen(true)
      }
    } catch { /* storage is optional; the update icon remains available */ }
  }, [notices, session?.user?.email])
  return <><button type="button" onClick={(event) => { event.preventDefault(); event.stopPropagation(); setOpen(true) }} title="What’s new in the portal" aria-label={`What’s new in the portal: ${notices.length} updates`} className="relative flex h-9 items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 text-xs font-bold text-[#263d8b] transition hover:border-blue-400 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950/60 dark:text-cyan-200"><Sparkles className="h-4 w-4" /><span>What’s New</span>{notices.length > 0 && <span className="ml-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#263d8b] px-1 text-[9px] font-bold text-white">{notices.length > 9 ? "9+" : notices.length}</span>}</button><Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[86vh] max-w-3xl overflow-y-auto border-slate-200 bg-background p-0 dark:border-slate-700"><div className="border-b border-blue-100 bg-gradient-to-r from-[#173f91] to-[#2563d8] px-6 py-5 text-white dark:border-blue-900"><DialogHeader className="space-y-1 text-left"><div className="flex items-center gap-2 text-blue-100"><Sparkles className="h-5 w-5" /><span className="text-xs font-bold uppercase tracking-[0.14em]">Si-Ware Portal</span></div><DialogTitle className="text-xl text-white">What’s new</DialogTitle><DialogDescription className="text-blue-100">New releases, features, improvements, and fixes for the portal.</DialogDescription></DialogHeader></div><div className="space-y-3 p-6">{notices.length === 0 ? <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">There are no updates to share yet.</p> : notices.map((notice) => { const style = typeStyle[notice.type] || typeStyle.update; const Icon = style.icon; return <article key={notice.id} className="rounded-xl border p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-bold ${style.className}`}><Icon className="h-3 w-3" />{style.label}</span><h3 className="mt-2 text-base font-semibold">{notice.title}</h3></div><time className="text-xs text-muted-foreground">{new Date(notice.postedAt).toLocaleDateString()}</time></div><p className="mt-2 whitespace-pre-line text-sm leading-6 text-muted-foreground">{notice.description || notice.summary}</p></article> })}</div></DialogContent></Dialog></>
}
