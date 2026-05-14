"use client"

import { useEffect } from "react"

const WIPE_KEY = "arp_prod_wipe_v1"

const KEYS_TO_CLEAR = [
  "arp_requests",
  "arp_mock_version",
  "arp_notifications",
  "feedback_surveys",
  "feedback_responses",
  "admin_tasks",
  "arp_viewed_comments",
]

export function ProductionDataWipe() {
  useEffect(() => {
    if (typeof window === "undefined") return
    if (localStorage.getItem(WIPE_KEY)) return

    KEYS_TO_CLEAR.forEach((key) => localStorage.removeItem(key))
    localStorage.setItem(WIPE_KEY, "1")
  }, [])

  return null
}
