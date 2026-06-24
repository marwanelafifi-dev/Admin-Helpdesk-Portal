/**
 * DELETE /api/requests/[id]/attachments/[attachmentId]
 * Delete attachment file and metadata
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { deleteFile } from '@/lib/fileStorage'
import { attachmentStore } from '@/lib/attachmentStore'
import { requestStore } from '@/lib/requestStore'

export async function DELETE(
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

    // Any signed-in user can delete — consistent with request management permissions.

    // Delete file from disk
    deleteFile(attachment.filePath)

    // Delete metadata
    attachmentStore.delete(attachmentId)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Delete error:', err)
    return NextResponse.json(
      { error: 'Failed to delete file' },
      { status: 500 }
    )
  }
}
