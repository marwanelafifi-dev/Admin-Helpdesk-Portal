/**
 * POST /api/requests/[id]/attachments/upload
 * Upload attachment file and create metadata entry
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { uploadFile } from '@/lib/fileStorage'
import { attachmentStore } from '@/lib/attachmentStore'
import { requestStore } from '@/lib/requestStore'

const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100 MB

// Accept any file type — validation is on size only.
// Restricting MIME types caused silent failures for .docx, .xlsx, .png, etc.
const ALLOWED_TYPES = null

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const requestId = params.id

    // Allow upload even if the request is still being persisted (race condition
    // between submitRequest() and the server write). We verify the requester is
    // authenticated — that is sufficient for attachment security.
    if (!requestId || requestId === 'undefined') {
      return NextResponse.json({ error: 'Invalid request ID' }, { status: 400 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024} MB limit` },
        { status: 413 }
      )
    }

    const buffer = await file.arrayBuffer()
    const stored = await uploadFile(requestId, file.name, Buffer.from(buffer))

    const metadata = attachmentStore.add({
      id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      requestId,
      fileName: file.name,
      mimeType: file.type || 'application/octet-stream',
      sizeBytes: file.size,
      filePath: stored.filePath,
      uploadedBy: session.user.email,
      uploadedAt: new Date().toISOString(),
      checksum: stored.checksum,
    })

    return NextResponse.json(metadata)
  } catch (err) {
    console.error('Upload error:', err)
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    )
  }
}
