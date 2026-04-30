import { useState, useEffect } from 'react'

export function useViewedComments() {
  const [viewedComments, setViewedComments] = useState<Record<string, number>>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('arp_viewed_comments')
      return stored ? JSON.parse(stored) : {}
    }
    return {}
  })

  // Save viewed comments to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('arp_viewed_comments', JSON.stringify(viewedComments))
    }
  }, [viewedComments])

  return { viewedComments, setViewedComments }
}
