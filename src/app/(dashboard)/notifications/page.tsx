"use client"

import { useState, useMemo } from "react"
import { Bell, Settings, CheckCheck, Trash2, ExternalLink, Zap } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useNotifications } from "@/hooks/useNotifications"
import { markNotificationAsRead, markAllNotificationsAsRead, deduplicateAnnouncementNotifications, type StoredNotification } from "@/lib/notificationStore"

const TYPE_COLORS: Record<string, string> = {
  status:           "bg-amber-100 text-amber-700",
  comment:          "bg-purple-100 text-purple-700",
  request_updated:  "bg-blue-100 text-blue-700",
  default:          "bg-slate-100 text-slate-600",
}

function fmt(iso: string) {
  try {
    return new Date(iso).toLocaleString("en-GB", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    })
  } catch { return iso }
}

export default function NotificationsPage() {
  const { data: session } = useSession()
  const userId = session?.user?.id
  const router = useRouter()
  const { notifications } = useNotifications(userId)
  const [filter, setFilter] = useState<"all" | "unread">("all")
  const [cleanupStatus, setCleanupStatus] = useState<{ removed: number } | null>(null)

  const filtered = useMemo(() =>
    filter === "unread"
      ? notifications.filter((n) => !n.read)
      : notifications,
    [notifications, filter]
  )

  const unreadCount = notifications.filter((n) => !n.read).length
  const announcementDuplicates = useMemo(() => {
    const seenIds = new Set<string>()
    let duplicateCount = 0
    for (const n of notifications) {
      if (n.id.startsWith("announcement-") && n.requestId) {
        if (seenIds.has(n.requestId)) duplicateCount++
        else seenIds.add(n.requestId)
      }
    }
    return duplicateCount
  }, [notifications])

  function handleClick(n: StoredNotification) {
    markNotificationAsRead(n.id)
    if (n.actionUrl) router.push(n.actionUrl)
  }

  function handleMarkAll() {
    if (userId) markAllNotificationsAsRead(userId)
  }

  function handleCleanupDuplicates() {
    if (userId) {
      const removed = deduplicateAnnouncementNotifications(userId)
      setCleanupStatus({ removed })
      setTimeout(() => setCleanupStatus(null), 3000)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-sm text-gray-500 mt-1">
            {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}` : "All caught up"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {announcementDuplicates > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleCleanupDuplicates}
              className="gap-2 text-sm text-amber-600 border-amber-200 hover:bg-amber-50"
            >
              <Zap className="h-4 w-4" />
              Clean {announcementDuplicates} duplicate{announcementDuplicates !== 1 ? "s" : ""}
            </Button>
          )}
          {cleanupStatus && (
            <span className="text-xs text-emerald-600 font-medium">
              ✓ Removed {cleanupStatus.removed} duplicate{cleanupStatus.removed !== 1 ? "s" : ""}
            </span>
          )}
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={handleMarkAll} className="gap-2 text-sm">
              <CheckCheck className="h-4 w-4" />
              Mark all read
            </Button>
          )}
          <Link href="/notifications/settings">
            <Button variant="outline" size="sm" className="gap-2 text-sm">
              <Settings className="h-4 w-4" />
              Settings
            </Button>
          </Link>
        </div>
      </div>

      {/* Filter pills */}
      <div className="flex gap-2">
        {(["all", "unread"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors capitalize
              ${filter === f ? "bg-slate-800 text-white border-slate-800" : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"}`}>
            {f === "unread" ? `Unread (${unreadCount})` : "All"}
          </button>
        ))}
      </div>

      {/* List */}
      <Card className="border shadow-sm">
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <Bell className="h-12 w-12 mb-3 text-gray-200" />
              <p className="text-sm font-medium">
                {filter === "unread" ? "No unread notifications" : "No notifications yet"}
              </p>
              <p className="text-xs mt-1 text-gray-400">
                Notifications appear here when requests are updated or commented on
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filtered.map((n) => {
                const colorClass = TYPE_COLORS[n.type] ?? TYPE_COLORS.default
                return (
                  <div
                    key={n.id}
                    onClick={() => handleClick(n)}
                    className={`flex items-start gap-4 px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors
                      ${!n.read ? "bg-blue-50/50 hover:bg-blue-50" : ""}`}
                  >
                    {/* Unread dot */}
                    <div className="mt-1.5 shrink-0">
                      {!n.read
                        ? <span className="block h-2 w-2 rounded-full bg-blue-500" />
                        : <span className="block h-2 w-2 rounded-full bg-transparent" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold ${!n.read ? "text-gray-900" : "text-gray-700"}`}>
                        {n.title}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.description}</p>
                    </div>

                    <div className="shrink-0 text-right flex flex-col items-end gap-1">
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full capitalize ${colorClass}`}>
                        {n.type.replace(/_/g, " ")}
                      </span>
                      <p className="text-[11px] text-gray-400 whitespace-nowrap">{fmt(n.createdAt)}</p>
                      {n.actionUrl && (
                        <ExternalLink className="h-3 w-3 text-gray-300 mt-0.5" />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          {filtered.length > 0 && (
            <div className="px-5 py-3 border-t bg-gray-50 text-[11px] text-gray-400 text-right">
              {filtered.length} notification{filtered.length !== 1 ? "s" : ""}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
