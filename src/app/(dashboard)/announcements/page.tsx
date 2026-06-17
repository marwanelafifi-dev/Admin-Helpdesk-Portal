"use client"

import { useEffect, useMemo, useState } from "react"
import { Bell, CheckCheck, Clock, Download, FileText, Megaphone, Paperclip, Search } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { markNotificationAsRead } from "@/lib/notificationStore"

type AnnouncementAttachment = {
  id: string
  name: string
  size: number
  mimeType: string
  url: string
}

type Announcement = {
  id: string
  subject: string
  body: string
  signature: string
  attachments: AnnouncementAttachment[]
  createdBy: string
  sentAt?: string
  recipientCount?: number
}

const STORAGE_PREFIX = "arp_announcements_read:"

function formatDate(value?: string) {
  if (!value) return "-"
  return new Date(value).toLocaleString()
}

function preview(value: string) {
  const compact = value.replace(/\s+/g, " ").trim()
  return compact.length > 160 ? `${compact.slice(0, 160)}...` : compact
}

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 KB"
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function readReadIds(userId: string) {
  try {
    const raw = window.localStorage.getItem(`${STORAGE_PREFIX}${userId}`)
    return new Set<string>(raw ? JSON.parse(raw) : [])
  } catch {
    return new Set<string>()
  }
}

function writeReadIds(userId: string, ids: Set<string>) {
  window.localStorage.setItem(`${STORAGE_PREFIX}${userId}`, JSON.stringify(Array.from(ids)))
  window.dispatchEvent(new Event("arp:announcements-read-updated"))
}

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [readIds, setReadIds] = useState<Set<string>>(new Set())
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userId, setUserId] = useState("")

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [sessionRes, feedRes] = await Promise.all([
          fetch("/api/auth/session", { cache: "no-store" }),
          fetch("/api/announcements/feed", { cache: "no-store" }),
        ])
        const sessionJson = await sessionRes.json()
        const currentUserId = sessionJson?.user?.id ?? sessionJson?.user?.email ?? "current-user"
        const feedJson = await feedRes.json()
        if (!feedRes.ok) throw new Error(feedJson?.error ?? "Failed to load announcements")
        if (cancelled) return

        const items = Array.isArray(feedJson.announcements) ? feedJson.announcements : []
        setUserId(currentUserId)
        setReadIds(readReadIds(currentUserId))
        setAnnouncements(items)
        setSelectedId((prev) => prev ?? items[0]?.id ?? null)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load announcements")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [])

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return announcements
    return announcements.filter((item) =>
      item.subject.toLowerCase().includes(term) ||
      item.body.toLowerCase().includes(term) ||
      item.createdBy.toLowerCase().includes(term)
    )
  }, [announcements, query])

  const unreadCount = announcements.filter((item) => !readIds.has(item.id)).length
  const selected = filtered.find((item) => item.id === selectedId) ?? filtered[0] ?? null

  function markRead(id: string) {
    if (!userId) return
    setReadIds((prev) => {
      const next = new Set(prev)
      next.add(id)
      writeReadIds(userId, next)
      markNotificationAsRead(`announcement-${userId}-${id}`)
      return next
    })
  }

  function markAllRead() {
    if (!userId) return
    const next = new Set(announcements.map((item) => item.id))
    writeReadIds(userId, next)
    announcements.forEach((item) => markNotificationAsRead(`announcement-${userId}-${item.id}`))
    setReadIds(next)
  }

  function selectAnnouncement(id: string) {
    setSelectedId(id)
    markRead(id)
    window.history.replaceState(null, "", `#${id}`)
  }

  useEffect(() => {
    if (!announcements.length) return
    const hashId = window.location.hash.replace("#", "")
    if (hashId && announcements.some((item) => item.id === hashId)) {
      selectAnnouncement(hashId)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [announcements.length])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-600 text-white">
              <Megaphone className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Announcements</h1>
              <p className="text-sm text-gray-500 mt-1">Company announcements from the Administration Team.</p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge className={cn("px-3 py-1", unreadCount > 0 ? "bg-red-600 text-white" : "bg-emerald-600 text-white")}>
            {unreadCount > 0 ? `${unreadCount} unread` : "All read"}
          </Badge>
          <Button variant="outline" onClick={markAllRead} disabled={announcements.length === 0 || unreadCount === 0}>
            <CheckCheck className="h-4 w-4" />
            Mark all read
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        <Card className="border shadow-sm">
          <CardHeader className="border-b bg-gray-50">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Bell className="h-4 w-4 text-blue-600" />
              Inbox
            </CardTitle>
            <div className="relative mt-3">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search announcements" className="pl-9" />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="px-5 py-10 text-center text-sm text-gray-500">Loading announcements...</div>
            ) : filtered.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-gray-500">No announcements found.</div>
            ) : (
              <div className="divide-y">
                {filtered.map((item) => {
                  const unread = !readIds.has(item.id)
                  const active = selected?.id === item.id
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => selectAnnouncement(item.id)}
                      className={cn(
                        "w-full px-5 py-4 text-left transition-colors hover:bg-blue-50",
                        active && "bg-blue-50",
                        unread && "bg-white"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <span className={cn("mt-1 h-2.5 w-2.5 rounded-full", unread ? "bg-red-500" : "bg-gray-300")} />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className={cn("truncate font-semibold", unread ? "text-gray-950" : "text-gray-700")}>{item.subject}</span>
                            {unread && <Badge className="bg-red-600 text-white">New</Badge>}
                          </span>
                          <span className="mt-1 block text-xs text-gray-500">{formatDate(item.sentAt)} by {item.createdBy}</span>
                          <span className="mt-2 block text-sm text-gray-600 line-clamp-2">{preview(item.body)}</span>
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          {selected ? (
            <>
              <CardHeader className="border-b bg-gray-50">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <CardTitle className="text-xl font-bold leading-tight text-gray-900">{selected.subject}</CardTitle>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                      <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {formatDate(selected.sentAt)}</span>
                      <span>From {selected.createdBy}</span>
                      {selected.attachments.length > 0 && <span>{selected.attachments.length} attachment(s)</span>}
                    </div>
                  </div>
                  {!readIds.has(selected.id) && (
                    <Button variant="outline" size="sm" onClick={() => markRead(selected.id)}>
                      <CheckCheck className="h-4 w-4" />
                      Mark read
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <article className="max-w-3xl">
                  <div className="space-y-3 text-sm leading-7 text-gray-800">
                    {selected.body.split(/\r?\n/).map((line, index) =>
                      line.trim() ? <p key={index}>{line}</p> : <div key={index} className="h-2" />
                    )}
                  </div>

                  <div className="mt-8 border-t pt-6">
                    <div className="whitespace-pre-line text-sm leading-6 text-gray-700">{selected.signature}</div>
                  </div>

                  {selected.attachments.length > 0 && (
                    <div className="mt-8 rounded-lg border bg-gray-50 p-4">
                      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
                        <Paperclip className="h-4 w-4 text-blue-600" />
                        Attachments
                      </div>
                      <div className="space-y-2">
                        {selected.attachments.map((attachment) => (
                          <a
                            key={attachment.id}
                            href={attachment.url}
                            download={attachment.name}
                            className="flex items-center gap-3 rounded-md border bg-white px-3 py-2 text-sm hover:bg-blue-50"
                          >
                            <FileText className="h-4 w-4 text-gray-500" />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate font-medium text-gray-900">{attachment.name}</span>
                              <span className="block text-xs text-gray-500">{formatBytes(attachment.size)}</span>
                            </span>
                            <Download className="h-4 w-4 text-blue-600" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </article>
              </CardContent>
            </>
          ) : (
            <CardContent className="px-5 py-16 text-center text-sm text-gray-500">
              Select an announcement to read it.
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  )
}
