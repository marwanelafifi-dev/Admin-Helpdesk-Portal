import { NextRequest, NextResponse } from 'next/server'
import { commentsStore } from '@/lib/commentsStore'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const requestIds = body.requestIds as string[]

    console.log(`[API] POST /api/requests/comments/batch - ${requestIds?.length || 0} requests`)

    if (!Array.isArray(requestIds) || requestIds.length === 0) {
      return NextResponse.json(
        { error: 'requestIds array is required and must not be empty' },
        { status: 400 }
      )
    }

    // Fetch comment counts for all request IDs
    const counts: Record<string, number> = {}
    for (const id of requestIds) {
      if (typeof id === 'string' && id.trim()) {
        const comments = commentsStore.getComments(id)
        counts[id] = comments.length
      }
    }

    console.log(`[API] Returning comment counts for ${Object.keys(counts).length} requests`)

    return NextResponse.json({
      data: counts,
    })
  } catch (error) {
    console.error('POST /api/requests/comments/batch error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch comment counts' },
      { status: 500 }
    )
  }
}
