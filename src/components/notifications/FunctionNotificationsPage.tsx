"use client"

import { useMemo, useState } from "react"
import { Bell, CheckCheck, ExternalLink, Settings, Zap } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useNotifications } from "@/hooks/useNotifications"
import { deduplicateAnnouncementNotifications, markAllNotificationsAsRead, markNotificationAsRead, notificationActionUrl, type StoredNotification } from "@/lib/notificationStore"
import type { FunctionId } from "@/lib/functionRegistry"
import { fmtDateTime } from "@/lib/utils"

const TYPE_COLORS: Record<string, string> = {
  status: "bg-amber-100 text-amber-700",
  comment: "bg-purple-100 text-purple-700",
  request_updated: "bg-blue-100 text-blue-700",
  announcement: "bg-emerald-100 text-emerald-700",
  default: "bg-slate-100 text-slate-600",
}

const FUNCTION_LABEL: Record<FunctionId, string> = { admin: "Administration", hr: "HR", finance: "Finance" }

export function FunctionNotificationsPage({ functionId }: { functionId: FunctionId }) {
  const { data: session } = useSession()
  const userId = session?.user?.id
  const router = useRouter()
  const { notifications } = useNotifications(userId, functionId)
  const [filter, setFilter] = useState<"all" | "unread">("all")
  const [cleanupStatus, setCleanupStatus] = useState<{ removed: number } | null>(null)
  const filtered = useMemo(() => filter === "unread" ? notifications.filter((n) => !n.read) : notifications, [notifications, filter])
  const unreadCount = notifications.filter((n) => !n.read).length
  const announcementDuplicates = useMemo(() => {
    const seenIds = new Set<string>()
    let count = 0
    for (const n of notifications) {
      if (n.id.startsWith("announcement-") && n.requestId) {
        if (seenIds.has(n.requestId)) count++
        else seenIds.add(n.requestId)
      }
    }
    return count
  }, [notifications])

  function handleClick(notification: StoredNotification) {
    markNotificationAsRead(notification.id)
    const actionUrl = notificationActionUrl(notification, functionId)
    if (actionUrl) router.push(actionUrl)
  }

  function handleMarkAll() {
    if (!userId) return
    markAllNotificationsAsRead(userId, functionId)
    void fetch("/api/notifications/inapp", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true, functionId }),
    }).catch(() => {})
  }

  function handleCleanupDuplicates() {
    if (!userId) return
    const removed = deduplicateAnnouncementNotifications(userId, functionId)
    setCleanupStatus({ removed })
    window.setTimeout(() => setCleanupStatus(null), 3000)
  }

  const label = FUNCTION_LABEL[functionId]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{label} Notifications</h1>
          <p className="mt-1 text-sm text-gray-500">
            {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}` : `All caught up in ${label}`}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {announcementDuplicates > 0 && (
            <Button variant="outline" size="sm" onClick={handleCleanupDuplicates} className="gap-2 border-amber-200 text-amber-600 hover:bg-amber-50">
              <Zap className="h-4 w-4" /> Clean {announcementDuplicates} duplicate{announcementDuplicates !== 1 ? "s" : ""}
            </Button>
          )}
          {cleanupStatus && <span className="text-xs font-medium text-emerald-600">Removed {cleanupStatus.removed}</span>}
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={handleMarkAll} className="gap-2">
              <CheckCheck className="h-4 w-4" /> Mark all read
            </Button>
          )}
          <Link href="/notifications/settings"><Button variant="outline" size="sm" className="gap-2"><Settings className="h-4 w-4" /> Settings</Button></Link>
        </div>
      </div>

      <div className="flex gap-2">
        {(["all", "unread"] as const).map((value) => (
          <button key={value} onClick={() => setFilter(value)} className={`rounded-full border px-4 py-1.5 text-sm font-medium capitalize transition-colors ${filter === value ? "border-slate-800 bg-slate-800 text-white" : "border-gray-200 bg-white text-gray-600 hover:border-gray-400"}`}>
            {value === "unread" ? `Unread (${unreadCount})` : "All"}
          </button>
        ))}
      </div>

      <Card className="border shadow-sm">
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <Bell className="mb-3 h-12 w-12 text-gray-200" />
              <p className="text-sm font-medium">{filter === "unread" ? `No unread ${label} notifications` : `No ${label} notifications yet`}</p>
              <p className="mt-1 text-xs">Only activity related to this function appears here.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filtered.map((n) => (
                <div key={n.id} onClick={() => handleClick(n)} className={`flex cursor-pointer items-start gap-4 px-5 py-4 transition-colors hover:bg-gray-50 ${!n.read ? "bg-blue-50/50 hover:bg-blue-50" : ""}`}>
                  <div className="mt-1.5 shrink-0"><span className={`block h-2 w-2 rounded-full ${!n.read ? "bg-blue-500" : "bg-transparent"}`} /></div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-semibold ${!n.read ? "text-gray-900" : "text-gray-700"}`}>{n.title}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-gray-500">{n.description}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1 text-right">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${TYPE_COLORS[n.type] ?? TYPE_COLORS.default}`}>{n.type.replace(/_/g, " ")}</span>
                    <time dateTime={n.createdAt} className="whitespace-nowrap text-[11px] text-gray-400">{fmtDateTime(n.createdAt)}</time>
                    {n.actionUrl && <ExternalLink className="mt-0.5 h-3 w-3 text-gray-300" />}
                  </div>
                </div>
              ))}
            </div>
          )}
          {filtered.length > 0 && <div className="border-t bg-gray-50 px-5 py-3 text-right text-[11px] text-gray-400">{filtered.length} {label} notification{filtered.length !== 1 ? "s" : ""}</div>}
        </CardContent>
      </Card>
    </div>
  )
}
