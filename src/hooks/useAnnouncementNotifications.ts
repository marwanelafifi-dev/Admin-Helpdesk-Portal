"use client"

import { useEffect } from "react"
import { addNotification, hasNotification } from "@/lib/notificationStore"

type FeedAnnouncement = {
  id: string
  subject: string
  body: string
  sentAt?: string
}

const POLL_MS = 60_000
const STORAGE_PREFIX = "arp_announcements_read:"

function readIdsForUser(userId: string) {
  try {
    const raw = window.localStorage.getItem(`${STORAGE_PREFIX}${userId}`)
    return new Set<string>(raw ? JSON.parse(raw) : [])
  } catch {
    return new Set<string>()
  }
}

function preview(value: string) {
  const compact = value.replace(/\s+/g, " ").trim()
  if (!compact) return "New announcement from the Administration Team"
  return compact.length > 90 ? `${compact.slice(0, 90)}...` : compact
}

export function useAnnouncementNotifications(userId?: string) {
  useEffect(() => {
    if (!userId) return
    const currentUserId = userId
    let cancelled = false

    async function sync() {
      try {
        const res = await fetch("/api/announcements/feed", { cache: "no-store" })
        if (!res.ok) return
        const json = await res.json()
        if (cancelled) return

        const announcements = Array.isArray(json.announcements)
          ? (json.announcements as FeedAnnouncement[])
          : []
        const readIds = readIdsForUser(currentUserId)

        announcements.forEach((announcement) => {
          const announcementId = announcement.id
          if (!announcementId || readIds.has(announcementId)) return
          const notificationId = `announcement-${currentUserId}-${announcementId}`
          if (hasNotification(notificationId)) return

          addNotification({
            id: notificationId,
            userId: currentUserId,
            type: "announcement",
            title: `Announcement: ${announcement.subject}`,
            description: preview(announcement.body),
            requestId: announcementId,
            actionUrl: `/announcements#${announcementId}`,
          })
        })
      } catch {}
    }

    sync()
    const timer = window.setInterval(sync, POLL_MS)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [userId])
}
