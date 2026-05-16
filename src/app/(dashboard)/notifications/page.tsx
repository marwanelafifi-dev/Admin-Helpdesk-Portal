"use client"

import { useCallback, useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Bell, CheckCheck, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface Notification {
  id: string
  type: string
  title: string
  message: string
  read: boolean
  createdAt: string
  link?: string
}

export default function NotificationsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const userId = session?.user?.id

  const [notifications, setNotifications] = useState<Notification[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isMarkingAll, setIsMarkingAll] = useState(false)
  const [skip, setSkip] = useState(0)
  const take = 20

  const loadNotifications = useCallback(async (offset = 0) => {
    if (status !== "authenticated" || !userId) return
    setIsLoading(true)
    try {
      const params = new URLSearchParams({ skip: String(offset), take: String(take) })
      const res = await fetch(`/api/notifications?${params}`, {
        credentials: "include",
        cache: "no-store",
        headers: { "x-user-id": userId },
      })
      if (!res.ok) return
      const data = await res.json()
      if (offset === 0) {
        setNotifications(data.notifications ?? [])
      } else {
        setNotifications((prev) => [...prev, ...(data.notifications ?? [])])
      }
      setTotal(data.total ?? 0)
    } finally {
      setIsLoading(false)
    }
  }, [status, userId])

  useEffect(() => {
    void loadNotifications(0)
  }, [loadNotifications])

  async function handleMarkAsRead(id: string, link?: string) {
    if (!userId) return
    await fetch(`/api/notifications/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "x-user-id": userId },
    })
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    )
    if (link) router.push(link)
  }

  async function handleMarkAllAsRead() {
    if (!userId) return
    setIsMarkingAll(true)
    try {
      await fetch("/api/notifications/read-all", {
        method: "PATCH",
        credentials: "include",
        headers: { "x-user-id": userId },
      })
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    } finally {
      setIsMarkingAll(false)
    }
  }

  function handleLoadMore() {
    const nextSkip = skip + take
    setSkip(nextSkip)
    void loadNotifications(nextSkip)
  }

  const unreadCount = notifications.filter((n) => !n.read).length
  const hasMore = notifications.length < total

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
          <p className="text-gray-600 mt-1">
            {total} notification{total !== 1 ? "s" : ""}
            {unreadCount > 0 && (
              <span className="ml-2 text-blue-600 font-medium">
                · {unreadCount} unread
              </span>
            )}
          </p>
        </div>

        {unreadCount > 0 && (
          <Button
            onClick={handleMarkAllAsRead}
            disabled={isMarkingAll}
            variant="outline"
            className="flex items-center gap-2"
          >
            <CheckCheck className="h-4 w-4" />
            {isMarkingAll ? "Marking..." : "Mark all as read"}
          </Button>
        )}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4" />
            All Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading && notifications.length === 0 ? (
            <div className="px-6 py-10 text-center text-muted-foreground text-sm">
              Loading...
            </div>
          ) : notifications.length === 0 ? (
            <div className="px-6 py-10 text-center text-muted-foreground text-sm">
              No notifications yet
            </div>
          ) : (
            <ul className="divide-y">
              {notifications.map((n) => (
                <li
                  key={n.id}
                  className={`flex items-start gap-4 px-6 py-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                    !n.read ? "bg-blue-50/60" : ""
                  }`}
                  onClick={() => handleMarkAsRead(n.id, n.link)}
                >
                  <div className="mt-1 shrink-0">
                    {!n.read ? (
                      <span className="h-2 w-2 rounded-full bg-blue-500 block" />
                    ) : (
                      <span className="h-2 w-2 rounded-full bg-gray-300 block" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-gray-800">
                        {n.title}
                      </p>
                      {!n.read && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-blue-100 text-blue-700">
                          New
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {n.message}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(n.createdAt).toLocaleString()}
                    </p>
                  </div>

                  {n.link && (
                    <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                  )}
                </li>
              ))}
            </ul>
          )}

          {hasMore && (
            <div className="px-6 py-4 border-t text-center">
              <Button
                variant="outline"
                size="sm"
                onClick={handleLoadMore}
                disabled={isLoading}
              >
                {isLoading ? "Loading..." : "Load more"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
