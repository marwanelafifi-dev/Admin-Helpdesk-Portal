"use client"

import { useState, useEffect, useRef } from "react"

export function useCommentSearch(query: string): Set<string> {
  const [matchIds, setMatchIds] = useState<Set<string>>(new Set())
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const q = query.trim()
    if (!q) {
      setMatchIds(new Set())
      return
    }

    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/requests/comments/search?q=${encodeURIComponent(q)}`)
        if (!res.ok) return
        const json = await res.json()
        setMatchIds(new Set<string>(json.requestIds ?? []))
      } catch {
        // silently ignore — comment search is a best-effort enhancement
      }
    }, 300)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [query])

  return matchIds
}
