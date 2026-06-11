"use client"

import { useEffect } from "react"
import { useSession } from "next-auth/react"

const INTERVAL_MS = 60_000 // ping every 60 seconds

export function useHeartbeat() {
  const { status } = useSession()

  useEffect(() => {
    if (status !== "authenticated") return

    const ping = () => {
      void fetch("/api/session/heartbeat", { method: "POST" }).catch(() => {})
    }

    ping() // immediate ping on mount
    const interval = window.setInterval(ping, INTERVAL_MS)
    return () => window.clearInterval(interval)
  }, [status])
}
