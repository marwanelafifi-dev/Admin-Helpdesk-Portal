import { useState, useEffect } from 'react'
import { commentsAPI } from '@/lib/apiClient'

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

      try {
        const results = await Promise.allSettled(
          validIds.map(id => commentsAPI.list(id))
        )

        results.forEach((result, index) => {
          const id = validIds[index]
          if (result.status === 'fulfilled' && result.value?.data) {
            counts[id] = result.value.data.length
          } else {
            counts[id] = 0
          }
        })

        if (isMounted) {
          setCommentCounts(counts)
        }
      } catch (err) {
        console.warn('Error fetching comment counts:', err)
        if (isMounted) {
          // Set all to 0 on error
          validIds.forEach(id => {
            counts[id] = 0
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
