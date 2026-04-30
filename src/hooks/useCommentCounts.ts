import { useState, useEffect, useCallback } from 'react'
import { commentsAPI } from '@/lib/apiClient'

export function useCommentCounts(requestIds: string[]) {
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({})

  // Use useCallback to memoize the fetch function
  const fetchCounts = useCallback(async () => {
    if (!requestIds || requestIds.length === 0) {
      setCommentCounts({})
      return
    }

    const validIds = requestIds.filter(id => id)

    if (validIds.length === 0) {
      setCommentCounts({})
      return
    }

    const counts: Record<string, number> = {}

    // Fetch all counts in parallel with Promise.allSettled
    try {
      const results = await Promise.allSettled(
        validIds.map(id => commentsAPI.list(id))
      )

      results.forEach((result, index) => {
        const id = validIds[index]
        if (result.status === 'fulfilled') {
          counts[id] = (result.value?.data || []).length
        } else {
          // If fetch fails, default to 0
          console.warn(`Failed to fetch comments for ${id}:`, result.reason)
          counts[id] = 0
        }
      })
    } catch (err) {
      console.error('Error fetching comment counts:', err)
      // Set all to 0 on failure
      validIds.forEach(id => {
        counts[id] = 0
      })
    }

    setCommentCounts(counts)
  }, [requestIds])

  useEffect(() => {
    fetchCounts()
  }, [fetchCounts])

  return commentCounts
}
