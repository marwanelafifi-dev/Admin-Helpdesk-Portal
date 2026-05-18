import { NextRequest, NextResponse } from 'next/server'
import { commentsStore } from '@/lib/commentsStore'

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ commentId: string }> }
) {
  try {
    const { commentId } = await params

    if (!commentId) {
      return NextResponse.json(
        { error: 'commentId is required' },
        { status: 400 }
      )
    }

    const deleted = commentsStore.deleteComment(commentId)

    if (!deleted) {
      return NextResponse.json(
        { error: 'Comment not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { message: 'Comment deleted successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('DELETE /api/requests/comments/[commentId] error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete comment' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ commentId: string }> }
) {
  try {
    const { commentId } = await params
    const { content } = await req.json()

    if (!commentId || !content) {
      return NextResponse.json(
        { error: 'commentId and content are required' },
        { status: 400 }
      )
    }

    const updated = commentsStore.updateComment(commentId, content)

    if (!updated) {
      return NextResponse.json(
        { error: 'Comment not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ data: updated }, { status: 200 })
  } catch (error) {
    console.error('PATCH /api/requests/comments/[commentId] error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update comment' },
      { status: 500 }
    )
  }
}
