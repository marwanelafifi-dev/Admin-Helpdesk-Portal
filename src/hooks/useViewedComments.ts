import { useState, useEffect, useRef } from 'react'

const STORAGE_KEY = 'arp_viewed_comments'
const DEBOUNCE_MS = 1000 // write at most once per second

export function useViewedComments() {
  const [viewedComments, setViewedComments] = useState<Record<string, number>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEY)
        return stored ? JSON.parse(stored) : {}
      } catch { return {} }
    }
    return {}
  })

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Debounce localStorage writes — fires at most once per second
  // instead of on every single state update.
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(viewedComments))
    }, DEBOUNCE_MS)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [viewedComments])

  return { viewedComments, setViewedComments }
}
