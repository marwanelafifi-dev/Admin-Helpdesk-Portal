import { useState } from "react"

/**
 * Hook to manage CC requests visibility toggle.
 * Persists the user's preference in sessionStorage so it survives page reloads within the session.
 */
export function useCcVisibility() {
  const [showCcRequests, setShowCcRequests] = useState(() => {
    if (typeof window === "undefined") return false
    try {
      const stored = sessionStorage.getItem("arp_show_cc_requests")
      return stored ? JSON.parse(stored) : false
    } catch {
      return false
    }
  })

  const toggleCcVisibility = (value: boolean) => {
    setShowCcRequests(value)
    try {
      sessionStorage.setItem("arp_show_cc_requests", JSON.stringify(value))
    } catch {
      // Silently fail if sessionStorage is unavailable
    }
  }

  return { showCcRequests, toggleCcVisibility }
}
