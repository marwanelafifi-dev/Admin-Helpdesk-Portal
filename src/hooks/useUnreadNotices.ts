"use client"

import { useEffect, useState } from "react"

const STORAGE_KEY = "arp_notices_read"

export interface ReadNoticeRecord {
  noticeId: string
  readAt: string
}

export function useUnreadNotices() {
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    // Fetch notices from server
    const fetchAndCount = async () => {
      try {
        const res = await fetch("/api/notices", { cache: "no-store" })
        if (!res.ok) return

        const data = await res.json()
        const notices = data?.data || data?.notices || []

        // Get read notice IDs from localStorage
        const readStr = localStorage.getItem(STORAGE_KEY)
        const readSet = new Set<string>()
        if (readStr) {
          try {
            const records: ReadNoticeRecord[] = JSON.parse(readStr)
            records.forEach((r) => readSet.add(r.noticeId))
          } catch {}
        }

        // Count unread
        const unread = notices.filter((notice: any) => !readSet.has(notice.id)).length
        setUnreadCount(unread)
      } catch {
        // Silently fail
      }
    }

    fetchAndCount()

    // Listen for storage events (other tabs marking notices as read)
    const handleStorageChange = () => {
      fetchAndCount()
    }

    window.addEventListener("storage", handleStorageChange)
    return () => window.removeEventListener("storage", handleStorageChange)
  }, [])

  return unreadCount
}

export function markNoticeAsRead(noticeId: string) {
  if (typeof window === "undefined") return

  const readStr = localStorage.getItem(STORAGE_KEY)
  let records: ReadNoticeRecord[] = []

  if (readStr) {
    try {
      records = JSON.parse(readStr)
    } catch {}
  }

  // Add or update the record
  const idx = records.findIndex((r) => r.noticeId === noticeId)
  if (idx >= 0) {
    records[idx] = { noticeId, readAt: new Date().toISOString() }
  } else {
    records.push({ noticeId, readAt: new Date().toISOString() })
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(records))

  // Dispatch storage event so other tabs update
  window.dispatchEvent(
    new StorageEvent("storage", {
      key: STORAGE_KEY,
      newValue: JSON.stringify(records),
    })
  )
}

export function getReadNoticeIds(): Set<string> {
  if (typeof window === "undefined") return new Set()

  const readStr = localStorage.getItem(STORAGE_KEY)
  const readSet = new Set<string>()

  if (readStr) {
    try {
      const records: ReadNoticeRecord[] = JSON.parse(readStr)
      records.forEach((r) => readSet.add(r.noticeId))
    } catch {}
  }

  return readSet
}
