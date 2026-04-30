import { useState, useEffect } from 'react'
import { commentsAPI } from '@/lib/apiClient'

export function useCommentCounts(requestIds: string[]) {
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({})

  useEffect(() => {
    const fetchCounts = async () => {
      const counts: Record<string, number> = {}
      for (const id of requestIds) {
        try {
          const commentsData = await commentsAPI.list(id)
          counts[id] = (commentsData.data || []).length
        } catch (err) {
          counts[id] = 0
        }
      }
      setCommentCounts(counts)
    }

    if (requestIds.length > 0) {
      fetchCounts()
    }
  }, [requestIds])

  return commentCounts
}
