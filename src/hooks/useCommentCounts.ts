import { useState, useEffect, useMemo } from 'react'
import { commentsAPI } from '@/lib/apiClient'

export function useCommentCounts(requestIds: string[]) {
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({})

  // Memoize valid IDs to prevent unnecessary re-renders
  const validIds = useMemo(() => {
    return (requestIds || []).filter(id => id)
  }, [requestIds.length, requestIds.join(',')])

  useEffect(() => {
    const fetchCounts = async () => {
      const counts: Record<string, number> = {}

      for (const id of validIds) {
        try {
          const commentsData = await commentsAPI.list(id)
          counts[id] = (commentsData.data || []).length
        } catch (err) {
          console.error(`Failed to fetch comment count for ${id}:`, err)
          counts[id] = 0
        }
      }
      setCommentCounts(counts)
    }

    // Only fetch if we have valid request IDs
    if (validIds.length > 0) {
      fetchCounts()
    } else {
      // Clear counts if no valid request IDs
      setCommentCounts({})
    }
  }, [validIds.length, validIds.join(',')])

  return commentCounts
}
