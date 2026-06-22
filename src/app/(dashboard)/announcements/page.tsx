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
      {/* Professional Header Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl shadow-lg p-8 text-white">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white/20 backdrop-blur">
                <Megaphone className="h-6 w-6" />
              </div>
              <h1 className="text-3xl font-bold">Announcements</h1>
            </div>
            <p className="text-blue-100 mt-2">Official communications from the Administration Team</p>
          </div>
          <div className="text-right">
            <Badge className={cn("px-4 py-2 text-sm font-semibold", unreadCount > 0 ? "bg-red-500 text-white" : "bg-emerald-500 text-white")}>
              {unreadCount > 0 ? `${unreadCount} unread` : "All read"}
            </Badge>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
        {/* Announcements List Card */}
        <Card className="border shadow-sm overflow-hidden">
          <CardHeader className="border-b bg-gradient-to-r from-gray-50 to-gray-100 pt-5 pb-4">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Bell className="h-5 w-5 text-blue-600" />
              Inbox
            </CardTitle>
            <p className="text-xs text-gray-500 mt-1 font-medium">{announcements.length} announcement{announcements.length !== 1 ? 's' : ''}</p>
            <div className="relative mt-4">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by subject or sender..."
                className="pl-9 bg-white border-gray-300 text-sm"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="px-5 py-12 text-center text-sm text-gray-500">
                <div className="animate-pulse">Loading announcements...</div>
              </div>
            ) : filtered.length === 0 ? (
              <div className="px-5 py-12 text-center text-sm text-gray-500">
                <Bell className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p>No announcements found</p>
              </div>
            ) : (
              <div className="divide-y max-h-[600px] overflow-y-auto">
                {filtered.map((item) => {
                  const unread = !readIds.has(item.id)
                  const active = selected?.id === item.id
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => selectAnnouncement(item.id)}
                      className={cn(
                        "w-full px-5 py-4 text-left transition-all duration-200 border-l-4 border-transparent",
                        active && "bg-blue-50 border-l-blue-600",
                        unread && !active && "bg-white hover:bg-blue-50/50 border-l-red-500",
                        !unread && !active && "bg-gray-50 hover:bg-gray-100"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        {/* Unread Indicator */}
                        {unread && (
                          <div className="mt-1 h-3 w-3 rounded-full bg-red-500 flex-shrink-0 animate-pulse" />
                        )}
                        {!unread && (
                          <div className="mt-1 h-3 w-3 rounded-full bg-gray-300 flex-shrink-0" />
                        )}

                        <span className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={cn("truncate font-bold text-sm", unread ? "text-gray-950" : "text-gray-700")}>
                              {item.subject}
                            </span>
                            {unread && <Badge className="bg-red-600 text-white text-xs">New</Badge>}
                          </div>
                          <div className="text-xs text-gray-500 font-medium mb-1">
                            {formatDate(item.sentAt)}
                          </div>
                          <div className="text-xs text-gray-600 line-clamp-1">{preview(item.body)}</div>
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </CardContent>
          {announcements.length > 0 && unreadCount > 0 && (
            <div className="border-t bg-blue-50 px-5 py-3">
              <Button
                variant="outline"
                size="sm"
                onClick={markAllRead}
                className="w-full text-xs font-semibold h-8 border-blue-200 text-blue-700 hover:bg-blue-100"
              >
                <CheckCheck className="h-3.5 w-3.5 mr-1" />
                Mark all as read
              </Button>
            </div>
          )}
        </Card>

        {/* Announcement Detail Card */}
        <Card className="border shadow-sm overflow-hidden">
          {selected ? (
            <>
              {/* Professional Header */}
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-6">
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <h2 className="text-2xl font-bold leading-tight">{selected.subject}</h2>
                    <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-blue-100">
                      <span className="inline-flex items-center gap-1.5">
                        <Clock className="h-4 w-4" />
                        {formatDate(selected.sentAt)}
                      </span>
                      <span className="text-blue-100">•</span>
                      <span className="font-semibold text-blue-50">From {selected.createdBy}</span>
                      {selected.attachments.length > 0 && (
                        <>
                          <span className="text-blue-100">•</span>
                          <span className="inline-flex items-center gap-1">
                            <Paperclip className="h-3.5 w-3.5" />
                            {selected.attachments.length} file{selected.attachments.length !== 1 ? 's' : ''}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  {!readIds.has(selected.id) && (
                    <Button
                      size="sm"
                      onClick={() => markRead(selected.id)}
                      className="bg-white text-blue-600 hover:bg-blue-50 font-semibold"
                    >
                      <CheckCheck className="h-4 w-4" />
                      Mark read
                    </Button>
                  )}
                </div>
              </div>

              {/* Content Area */}
              <CardContent className="p-8">
                <article className="max-w-4xl mx-auto">
                  {/* Main Content */}
                  <div className="prose prose-sm max-w-none">
                    <div className="space-y-4 text-base leading-relaxed text-gray-800">
                      {selected.body.split(/\r?\n/).map((line, index) =>
                        line.trim() ? (
                          <p key={index} className="text-gray-800 font-normal">
                            {line}
                          </p>
                        ) : (
                          <div key={index} className="h-2" />
                        )
                      )}
                    </div>
                  </div>

                  {/* Signature */}
                  <div className="mt-10 pt-8 border-t border-gray-300">
                    <div className="whitespace-pre-line text-sm leading-relaxed text-gray-600 font-mono text-xs bg-gray-50 p-4 rounded border border-gray-200">
                      {selected.signature}
                    </div>
                  </div>

                  {/* Attachments */}
                  {selected.attachments.length > 0 && (
                    <div className="mt-10 pt-8 border-t border-gray-300">
                      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Paperclip className="h-5 w-5 text-blue-600" />
                        Attachments
                      </h3>
                      <div className="grid gap-3">
                        {selected.attachments.map((attachment) => (
                          <a
                            key={attachment.id}
                            href={attachment.url}
                            download={attachment.name}
                            className="flex items-center gap-4 rounded-lg border border-gray-200 bg-white px-4 py-3 hover:bg-blue-50 hover:border-blue-300 transition-all group"
                          >
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 group-hover:bg-blue-100">
                              <FileText className="h-5 w-5 text-blue-600" />
                            </div>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate font-semibold text-gray-900 group-hover:text-blue-600">
                                {attachment.name}
                              </span>
                              <span className="block text-xs text-gray-500">{formatBytes(attachment.size)}</span>
                            </span>
                            <Download className="h-5 w-5 text-gray-400 group-hover:text-blue-600 flex-shrink-0" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </article>
              </CardContent>
            </>
          ) : (
            <CardContent className="px-8 py-20 text-center">
              <Megaphone className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">Select an announcement from the list to read it</p>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  )
}
