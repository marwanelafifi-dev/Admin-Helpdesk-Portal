/**
 * GET /api/requests/[id]/attachments/[attachmentId]/download
 * Download and stream attachment file
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { downloadFile } from '@/lib/fileStorage'
import { attachmentStore } from '@/lib/attachmentStore'
import { requestStore } from '@/lib/requestStore'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; attachmentId: string } }
) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const requestId = params.id
    const attachmentId = params.attachmentId

    const req = requestStore.get(requestId)
    if (!req) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }

    const attachment = attachmentStore.getById(attachmentId)
    if (!attachment || attachment.requestId !== requestId) {
      return NextResponse.json({ error: 'Attachment not found' }, { status: 404 })
    }

    // Any signed-in user can download — consistent with request visibility.

    const buffer = downloadFile(attachment.filePath)

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': attachment.mimeType,
        'Content-Disposition': `inline; filename="${encodeURIComponent(attachment.fileName)}"`,
        'Content-Length': buffer.length.toString(),
      },
    })
  } catch (err) {
    console.error('Download error:', err)
    return NextResponse.json(
      { error: 'Failed to download file' },
      { status: 500 }
    )
  }
}
