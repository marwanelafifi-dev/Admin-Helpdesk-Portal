"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ChevronRight, FileText, Globe, Link2, Megaphone, Search, UsersRound } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { fmtDateTime } from "@/lib/utils"

interface AnnouncementTeaser {
  id: string
  subject: string
  body: string
  sentAt: string
  createdBy: string
}

interface QuickLinkRow {
  id: string
  title: string
  description?: string
  url: string
  owner: string
}

interface IntranetDocumentRow {
  id: string
  title: string
  description?: string
  owner: string
  fileName: string
  createdAt: string
}

interface DirectoryUser {
  id: string
  name: string
  email: string
  image: string | null
  role: string
}

function stripToText(html: string, max = 160): string {
  const text = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()
  return text.length > max ? `${text.slice(0, max)}…` : text
}

function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "?"
  )
}

export default function IntranetHomePage() {
  const [announcements, setAnnouncements] = useState<AnnouncementTeaser[]>([])
  const [links, setLinks] = useState<QuickLinkRow[]>([])
  const [documents, setDocuments] = useState<IntranetDocumentRow[]>([])
  const [directory, setDirectory] = useState<DirectoryUser[]>([])
  const [directoryQuery, setDirectoryQuery] = useState("")
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      fetch("/api/announcements/feed?scope=company").then((r) => (r.ok ? r.json() : { announcements: [] })),
      fetch("/api/quick-links").then((r) => (r.ok ? r.json() : { data: [] })),
      fetch("/api/intranet-documents").then((r) => (r.ok ? r.json() : { data: [] })),
      fetch("/api/users/directory").then((r) => (r.ok ? r.json() : { data: [] })),
    ]).then(([announcementsRes, linksRes, docsRes, directoryRes]) => {
      if (cancelled) return
      setAnnouncements(Array.isArray(announcementsRes.announcements) ? announcementsRes.announcements.slice(0, 5) : [])
      setLinks(Array.isArray(linksRes.data) ? linksRes.data : [])
      setDocuments(Array.isArray(docsRes.data) ? docsRes.data.slice(0, 4) : [])
      setDirectory(Array.isArray(directoryRes.data) ? directoryRes.data : [])
      setLoaded(true)
    }).catch(() => { if (!cancelled) setLoaded(true) })
    return () => { cancelled = true }
  }, [])

  const filteredDirectory = useMemo(() => {
    const q = directoryQuery.trim().toLowerCase()
    if (!q) return []
    return directory.filter((u) =>
      (u.name ?? "").toLowerCase().includes(q) || (u.email ?? "").toLowerCase().includes(q)
    ).slice(0, 6)
  }, [directory, directoryQuery])

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-emerald-600 text-white"><Globe className="h-7 w-7" /></div>
        <h1 className="mt-5 text-3xl font-bold text-slate-900 dark:text-white">Company Intranet</h1>
        <p className="mt-3 text-slate-600 dark:text-slate-400">Company news, quick links, the employee directory, and shared documents — all in one place.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2 text-base"><Megaphone className="h-4 w-4 text-emerald-600" /> Company News</CardTitle>
            <Link href="/departments/intranet/news" className="flex items-center text-sm font-medium text-emerald-600 hover:underline">View all <ChevronRight className="h-4 w-4" /></Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {!loaded ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">Loading…</p>
            ) : announcements.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">No announcements yet.</p>
            ) : (
              announcements.map((a) => (
                <div key={a.id} className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-slate-900 dark:text-white">{a.subject}</p>
                    <span className="whitespace-nowrap text-xs text-slate-500 dark:text-slate-400">{fmtDateTime(a.sentAt)}</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{stripToText(a.body)}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2 text-base"><Link2 className="h-4 w-4 text-emerald-600" /> Quick Links</CardTitle>
            <Link href="/departments/intranet/quick-links" className="flex items-center text-sm font-medium text-emerald-600 hover:underline">View all <ChevronRight className="h-4 w-4" /></Link>
          </CardHeader>
          <CardContent>
            {!loaded ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">Loading…</p>
            ) : links.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">No quick links yet.</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {links.slice(0, 8).map((link) => (
                  <a key={link.id} href={link.url} target="_blank" rel="noreferrer" className="rounded-lg border border-slate-200 p-3 text-sm font-medium text-slate-900 hover:border-emerald-400 hover:bg-emerald-50/50 dark:border-slate-700 dark:text-white dark:hover:border-emerald-700 dark:hover:bg-emerald-950/30">
                    {link.title}
                  </a>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><UsersRound className="h-4 w-4 text-emerald-600" /> Employee Directory</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={directoryQuery}
                onChange={(e) => setDirectoryQuery(e.target.value)}
                placeholder="Search by name or email…"
                className="w-full rounded-md border border-slate-200 bg-transparent py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700"
              />
            </div>
            {directoryQuery.trim() && (
              <div className="space-y-1">
                {filteredDirectory.length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400">No matches.</p>
                ) : (
                  filteredDirectory.map((u) => (
                    <div key={u.id} className="flex items-center gap-3 rounded-lg border border-slate-200 p-2 dark:border-slate-700">
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-emerald-100 text-xs font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                        {u.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={u.image} alt={u.name} className="h-full w-full object-cover" />
                        ) : initials(u.name ?? u.email)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{u.name || u.email}</p>
                        <p className="truncate text-xs text-slate-500 dark:text-slate-400">{u.email} · {u.role}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
            <Link href="/departments/intranet/directory" className="flex items-center text-sm font-medium text-emerald-600 hover:underline">Open full directory <ChevronRight className="h-4 w-4" /></Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2 text-base"><FileText className="h-4 w-4 text-emerald-600" /> Document Library</CardTitle>
            <Link href="/departments/intranet/documents" className="flex items-center text-sm font-medium text-emerald-600 hover:underline">View all <ChevronRight className="h-4 w-4" /></Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {!loaded ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">Loading…</p>
            ) : documents.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">No documents yet.</p>
            ) : (
              documents.map((doc) => (
                <a key={doc.id} href={`/api/intranet-documents/${doc.id}/download`} className="flex items-center justify-between rounded-lg border border-slate-200 p-3 text-sm hover:border-emerald-400 hover:bg-emerald-50/50 dark:border-slate-700 dark:hover:border-emerald-700 dark:hover:bg-emerald-950/30">
                  <span className="min-w-0 truncate font-medium text-slate-900 dark:text-white">{doc.title}</span>
                  <span className="whitespace-nowrap text-xs text-slate-500 dark:text-slate-400">{fmtDateTime(doc.createdAt)}</span>
                </a>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
