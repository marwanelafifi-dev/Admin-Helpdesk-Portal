"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"

/** Records authenticated page access on the server. It deliberately records
 * navigation rather than raw clicks, which gives reviewable ISO-relevant
 * evidence without capturing form data or sensitive screen interactions. */
export function SecurityActivityTracker() {
  const pathname = usePathname()

  useEffect(() => {
    if (!pathname) return
    void fetch("/api/audit/activity", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ pathname }),
      keepalive: true,
    })
  }, [pathname])

  return null
}
