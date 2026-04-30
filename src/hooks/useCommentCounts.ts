import { useState, useEffect } from 'react'
import { commentsAPI } from '@/lib/apiClient'

export function useCommentCounts(requestIds: string[]) {
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({})

  useEffect(() => {
    const fetchCounts = async () => {
      const counts: Record<string, number> = {}
      // Filter out undefined/null IDs
      const validIds = (requestIds || []).filter(id => id)

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
    const validIds = (requestIds || []).filter(id => id)
    if (validIds.length > 0) {
      fetchCounts()
    } else {
      // Clear counts if no valid request IDs
      setCommentCounts({})
    }
  }, [requestIds])

  return commentCounts
}
