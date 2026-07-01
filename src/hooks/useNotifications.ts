"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import {
  getNotificationsForUser,
  getUnreadNotificationCount,
  subscribeNotifications,
  addNotification,
  StoredNotification,
} from "@/lib/notificationStore"

const POLL_INTERVAL = 30_000 // 30 seconds

export function useNotifications(userId?: string) {
  const [notifications, setNotifications] = useState<StoredNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const lastPollAt = useRef<string | null>(null)

  const refresh = useCallback(() => {
    if (!userId) return
    const items = getNotificationsForUser(userId)
    setNotifications(items)
    setUnreadCount(getUnreadNotificationCount(userId))
  }, [userId])

  // Poll server for notifications created by other users' browsers
  const pollServer = useCallback(async () => {
    if (!userId) return
    try {
      const url = lastPollAt.current
        ? `/api/notifications/inapp?since=${encodeURIComponent(lastPollAt.current)}`
        : "/api/notifications/inapp"
      lastPollAt.current = new Date().toISOString()
      const res = await fetch(url)
      if (!res.ok) return
      const { data } = await res.json()
      if (!Array.isArray(data) || data.length === 0) return

      // Merge server notifications into localStorage — addNotification dedupes by id
      data.forEach((n: StoredNotification) => addNotification(n))
      // refresh() is triggered by the subscriber registered below
    } catch {
      // silent — polling is best-effort
    }
  }, [userId])

  useEffect(() => {
    if (!userId) {
      setNotifications([])
      setUnreadCount(0)
      lastPollAt.current = null
      return
    }

    refresh()
    const unsubscribe = subscribeNotifications(() => refresh())

    // Poll immediately on mount, then every 30s
    void pollServer()
    const interval = setInterval(pollServer, POLL_INTERVAL)

    // Re-poll on tab focus
    const onFocus = () => void pollServer()
    window.addEventListener("focus", onFocus)

    return () => {
      unsubscribe()
      clearInterval(interval)
      window.removeEventListener("focus", onFocus)
    }
  }, [userId, refresh, pollServer])

  return { notifications, unreadCount }
}
