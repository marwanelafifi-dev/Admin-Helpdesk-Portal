import { useState, useEffect } from 'react'

// In-memory cache for comment counts to avoid re-fetching
const commentCountsCache: Record<string, number> = {}

// Utility function to clear cache for a specific request ID (used when new comment is added)
export function invalidateCommentCountCache(requestId: string) {
  delete commentCountsCache[requestId]
}

// Utility function to clear all comment count cache
export function clearCommentCountCache() {
  Object.keys(commentCountsCache).forEach(key => delete commentCountsCache[key])
}

export function useCommentCounts(requestIds: string[]) {
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({})

  useEffect(() => {
    // Early return for empty or invalid IDs
    const validIds = (requestIds || []).filter(id => typeof id === 'string' && id.trim())
    if (validIds.length === 0) {
      setCommentCounts({})
      return
    }

    let isMounted = true

    const fetchCounts = async () => {
      const counts: Record<string, number> = {}
      const idsToFetch: string[] = []

      // Check cache first
      for (const id of validIds) {
        if (commentCountsCache.hasOwnProperty(id)) {
          counts[id] = commentCountsCache[id]
        } else {
          idsToFetch.push(id)
        }
      }

      // If all are cached, return immediately
      if (idsToFetch.length === 0) {
        if (isMounted) {
          setCommentCounts(counts)
        }
        return
      }

      try {
        const response = await fetch('/api/requests/comments/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ requestIds: idsToFetch }),
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        const result = await response.json()

        // Update cache and counts
        if (result.data) {
          Object.entries(result.data).forEach(([id, count]) => {
            commentCountsCache[id] = count as number
            counts[id] = count as number
          })
        }

        if (isMounted) {
          setCommentCounts(counts)
        }
      } catch (err) {
        console.warn('Error fetching comment counts:', err)
        if (isMounted) {
          // Set all to 0 on error, but use cached values if available
          validIds.forEach(id => {
            if (!counts.hasOwnProperty(id)) {
              counts[id] = 0
            }
          })
          setCommentCounts(counts)
        }
      }
    }

    fetchCounts()

    return () => {
      isMounted = false
    }
  }, [requestIds.length]) // Only depend on length, not the array itself

  return commentCounts
}
