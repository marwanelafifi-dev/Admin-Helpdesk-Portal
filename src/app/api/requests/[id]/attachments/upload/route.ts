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
const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
  'image/gif',
  'text/plain',
  'text/csv',
]

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
    const req = requestStore.get(requestId)
    if (!req) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }

    // Any signed-in user can upload — consistent with comment permissions.
    // The auth() check above already ensures only authenticated users reach here.

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

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'File type not allowed' },
        { status: 415 }
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
