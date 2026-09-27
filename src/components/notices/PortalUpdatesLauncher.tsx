"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Bug, Sparkles, Wrench } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

type Scope = "whole_app" | "administration" | "finance" | "people" | "it"
type Notice = { id: string; title: string; type: "feature" | "bug_fix" | "update"; scope?: Scope; summary: string; description?: string; postedAt: string; postedBy?: string }

const scopeLabels: Record<Scope, string> = { whole_app: "Whole App Update", administration: "Administration Team", finance: "Finance Team", people: "People Team", it: "IT Team" }
const typeStyle = {
  feature: { label: "New feature", icon: Sparkles, className: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-200" },
  bug_fix: { label: "Improvement", icon: Bug, className: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200" },
  update: { label: "Update", icon: Wrench, className: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-200" },
}

export function PortalUpdatesLauncher() {
  const { data: session } = useSession()
  const [notices, setNotices] = useState<Notice[]>([])
  const [open, setOpen] = useState(false)

  useEffect(() => {
    fetch("/api/notices").then((response) => response.ok ? response.json() : { data: [] })
      .then((data) => setNotices(Array.isArray(data.data) ? data.data : []))
      .catch(() => setNotices([]))
  }, [])

  useEffect(() => {
    const email = session?.user?.email?.toLowerCase()
    if (!email || notices.length === 0) return
    const key = `arp_seen_published_portal_updates_${email}`
    const published = notices.filter((notice) => notice.postedBy && notice.postedBy !== "System")
    try {
      const seen = new Set<string>(JSON.parse(localStorage.getItem(key) || "[]"))
      const unseen = published.filter((notice) => !seen.has(notice.id))
      if (unseen.length) {
        localStorage.setItem(key, JSON.stringify([...seen, ...unseen.map((notice) => notice.id)]))
        setOpen(true)
      }
    } catch {}
  }, [notices, session?.user?.email])

  return <>
    <button type="button" onClick={() => setOpen(true)} title="What's new in the portal" className="relative flex h-9 items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 text-xs font-bold text-[#263d8b] transition hover:border-blue-400 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950/60 dark:text-cyan-200">
      <Sparkles className="h-4 w-4" />
      <span>What's New</span>
      {notices.length > 0 && <span className="ml-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#263d8b] px-1 text-[9px] font-bold text-white">{notices.length > 9 ? "9+" : notices.length}</span>}
    </button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[86vh] max-w-3xl overflow-y-auto border-slate-200 bg-background p-0 dark:border-slate-700">
        <div className="relative overflow-hidden border-b border-blue-200 bg-gradient-to-br from-[#f5f9ff] via-[#eef6ff] to-[#dcecff] px-6 py-5 text-[#173f91] before:pointer-events-none before:absolute before:-left-16 before:-top-20 before:h-48 before:w-72 before:rounded-full before:bg-blue-300/35 before:blur-3xl dark:border-sky-300/25 dark:!bg-[radial-gradient(ellipse_90%_170%_at_22%_0%,_#1d5487_0%,_#13395f_38%,_#0a1d34_100%)] dark:before:bg-cyan-300/15 dark:text-white">
          <DialogHeader className="relative z-10 space-y-1 pr-10 text-left">
            <div className="flex items-center gap-2 text-[#173f91] dark:text-cyan-100"><span className="flex h-8 w-8 items-center justify-center rounded-lg border border-blue-200 bg-white/70 shadow-sm dark:border-sky-300/25 dark:bg-sky-300/10"><Sparkles className="h-4 w-4" /></span><span className="text-xs font-bold uppercase tracking-[0.14em]">Si-Ware Portal</span></div>
            <DialogTitle className="text-xl text-[#173f91] dark:text-white">What's new</DialogTitle>
            <DialogDescription className="text-slate-600 dark:text-slate-300">New releases, features, improvements, and fixes for the portal.</DialogDescription>
          </DialogHeader>
        </div>
        <div className="space-y-3 p-6">
          {notices.map((notice) => {
            const style = typeStyle[notice.type]
            const Icon = style.icon
            return <article key={notice.id} className="rounded-xl border p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div className="flex items-center gap-2"><span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-bold ${style.className}`}><Icon className="h-3 w-3" />{style.label}</span><span className="rounded-full border px-2 py-1 text-[11px] font-semibold text-muted-foreground">{scopeLabels[notice.scope || "whole_app"]}</span></div><time className="text-xs text-muted-foreground">{new Date(notice.postedAt).toLocaleDateString()}</time></div><h3 className="mt-3 text-base font-semibold">{notice.title}</h3><p className="mt-2 whitespace-pre-line text-sm leading-6 text-muted-foreground">{notice.description || notice.summary}</p></article>
          })}
        </div>
      </DialogContent>
    </Dialog>
  </>
}
