"use client"

import { useEffect } from "react"

// Bump this when you ship a release that needs every browser to discard
// previously-seeded mock data. Each browser runs the wipe exactly once per
// version marker (the marker key is set after a successful wipe).
//
// v1 -> initial Production v1.0 wipe (requests, tasks, feedback, notifications)
// v2 -> clear Company Data seeds (Suppliers / Cost Centers / Managers / Carriers
//       / Departments / Sectors) so admins start from an empty slate.
const WIPE_KEY = "arp_prod_wipe_v2"

const KEYS_TO_CLEAR = [
  "arp_requests",
  "arp_mock_version",
  "arp_notifications",
  "feedback_surveys",
  "feedback_responses",
  "admin_tasks",
  "arp_viewed_comments",
  "arp_company_data",
]

export function ProductionDataWipe() {
  useEffect(() => {
    if (typeof window === "undefined") return
    if (localStorage.getItem(WIPE_KEY)) return

    KEYS_TO_CLEAR.forEach((key) => localStorage.removeItem(key))
    // Also clear the older v1 marker so we don't leave orphaned keys behind
    localStorage.removeItem("arp_prod_wipe_v1")
    localStorage.setItem(WIPE_KEY, "1")
  }, [])

  return null
}
