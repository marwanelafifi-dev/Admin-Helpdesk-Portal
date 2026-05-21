import { NextRequest, NextResponse } from 'next/server'
import { commentsStore } from '@/lib/commentsStore'

export async function GET(req: NextRequest) {
  try {
    const requestId = req.nextUrl.searchParams.get('requestId')
    const limit = parseInt(req.nextUrl.searchParams.get('limit') || '50', 10)
    const offset = parseInt(req.nextUrl.searchParams.get('offset') || '0', 10)

    console.log(`[API] GET /api/requests/comments?requestId=${requestId}`)

    if (!requestId) {
      return NextResponse.json(
        { error: 'requestId is required' },
        { status: 400 }
      )
    }

    const allComments = commentsStore.getComments(requestId)
    const paginated = allComments.slice(offset, offset + limit)

    console.log(`[API] Returning ${paginated.length} comments for request ${requestId}`)

    return NextResponse.json({
      data: paginated,
      total: allComments.length,
      limit,
      offset,
    })
  } catch (error) {
    console.error('GET /api/requests/comments error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch comments' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/requests/comments?requestId=XYZ
 * Wipes every comment for the given request. Called by the engine right
 * after a new request is created to evict any stale comments left over
 * from a previous request that reused the same ID — without this, the
 * new request inherits ghost comments because request IDs reset after
 * a Clear All and easily collide with old data.
 */
export async function DELETE(req: NextRequest) {
  try {
    const requestId = req.nextUrl.searchParams.get('requestId')
    if (!requestId) {
      return NextResponse.json({ error: 'requestId is required' }, { status: 400 })
    }
    const removed = commentsStore.clearForRequest(requestId)
    return NextResponse.json({ requestId, removed })
  } catch (error) {
    console.error('DELETE /api/requests/comments error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to clear comments' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const requestId = (formData.get('requestId') as string)?.trim()
    const content = (formData.get('content') as string)?.trim() ?? ''
    const authorId = (formData.get('authorId') as string)?.trim()
    const authorName = (formData.get('authorName') as string)?.trim()
    const authorEmail = (formData.get('authorEmail') as string)?.trim()
    const files = formData.getAll('files') as File[]

    const hasContent = content.length > 0
    const hasFiles = files.length > 0

    console.log('POST /api/requests/comments:', {
      requestId,
      contentLength: content.length,
      authorId,
      authorName,
      filesCount: files.length,
    })

    if (!requestId || !authorId || (!hasContent && !hasFiles)) {
      const missing = []
      if (!requestId) missing.push('requestId')
      if (!authorId) missing.push('authorId')
      if (!hasContent && !hasFiles) missing.push('content or attachment')
      console.error('Missing fields:', missing)
      return NextResponse.json(
        { error: `Missing fields: ${missing.join(', ')}` },
        { status: 400 }
      )
    }

    // Create comment ID
    const commentId = `CMT-${Date.now()}`

    // Process file attachments
    const attachments = []
    if (files.length > 0) {
      for (const file of files) {
        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)
        const dataUrl = `data:${file.type};base64,${buffer.toString('base64')}`

        attachments.push({
          id: `ATT-${Date.now()}-${Math.random()}`,
          name: file.name,
          url: dataUrl,
          sizeBytes: file.size,
        })
      }
    }

    const comment = {
      id: commentId,
      content,
      authorId,
      author: {
        id: authorId,
        name: authorName || 'User',
        email: authorEmail || `user@si-ware.com`,
      },
      attachments: attachments.length > 0 ? attachments : undefined,
      createdAt: new Date().toISOString(),
    }

    // Store comment
    commentsStore.addComment(requestId, comment)

    return NextResponse.json({ data: comment }, { status: 201 })
  } catch (error) {
    console.error('POST /api/requests/comments error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create comment' },
      { status: 500 }
    )
  }
}
