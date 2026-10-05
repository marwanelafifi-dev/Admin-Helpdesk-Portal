"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"

export const APPROVAL_CALLBACK_STORAGE_KEY = "arp_pending_approval_callback"
const APPROVAL_CALLBACK_MAX_AGE_MS = 10 * 60 * 1000

type PendingApprovalCallback = {
  url: string
  createdAt: number
}

export function isSafeApprovalCallback(value: string) {
  if (!value.startsWith("/") || value.startsWith("//")) return false
  try {
    const parsed = new URL(value, window.location.origin)
    return /^\/api\/requests\/[^/?]+\/(approve|reject)$/.test(parsed.pathname)
      && parsed.searchParams.has("token")
      && parsed.searchParams.get("fresh") === "1"
  } catch {
    return false
  }
}

/**
 * OAuth providers can replace a relative callback URL with the portal landing
 * page. Preserve only signed approval callbacks in session storage and resume
 * them after a manager has completed authentication.
 */
export function ApprovalCallbackHandoff() {
  const pathname = usePathname()
  const { status } = useSession()

  useEffect(() => {
    if (pathname !== "/landing" || status !== "authenticated") return

    try {
      const raw = sessionStorage.getItem(APPROVAL_CALLBACK_STORAGE_KEY)
      if (!raw) return
      const pending = JSON.parse(raw) as Partial<PendingApprovalCallback>
      sessionStorage.removeItem(APPROVAL_CALLBACK_STORAGE_KEY)

      if (
        typeof pending.url === "string"
        && typeof pending.createdAt === "number"
        && Date.now() - pending.createdAt <= APPROVAL_CALLBACK_MAX_AGE_MS
        && isSafeApprovalCallback(pending.url)
      ) {
        window.location.replace(pending.url)
      }
    } catch {
      sessionStorage.removeItem(APPROVAL_CALLBACK_STORAGE_KEY)
    }
  }, [pathname, status])

  return null
}
