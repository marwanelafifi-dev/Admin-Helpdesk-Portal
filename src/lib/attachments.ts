/**
 * Shared attachment helpers used by every module form.
 *
 * Attachments are now stored on disk with metadata in a separate store.
 * The attachment reference in the request payload only includes the metadata ID,
 * not the base64 data. This allows safe multi-user access and prevents
 * localStorage quota issues.
 */

export interface FileAttachment {
  id: string
  name: string
  url?: string // API download URL, computed on client: `/api/requests/{requestId}/attachments/{id}/download`
  mimeType: string
  sizeBytes: number
  uploadedAt: string
  uploadedBy?: string
  checksum?: string
}

/**
 * Legacy base64 attachment for backward compatibility during migration.
 * New attachments should use FileAttachment.
 */
export interface AttachmentPayload {
  id: string
  name: string
  url: string           // data: URL (legacy)
  mimeType: string
  sizeBytes: number
  uploadedAt: string
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ""))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

/**
 * Upload file to server and get metadata reference.
 * Used by forms when creating/editing requests.
 */
export async function uploadAttachment(
  requestId: string,
  file: File,
): Promise<FileAttachment> {
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch(`/api/requests/${requestId}/attachments/upload`, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.statusText}`)
  }

  const metadata = await response.json()
  return {
    id: metadata.id,
    name: metadata.fileName,
    url: `/api/requests/${requestId}/attachments/${metadata.id}/download`,
    mimeType: metadata.mimeType,
    sizeBytes: metadata.sizeBytes,
    uploadedAt: metadata.uploadedAt,
    uploadedBy: metadata.uploadedBy,
    checksum: metadata.checksum,
  }
}

/**
 * Convert a list of File objects into FileAttachment entries via API upload.
 * Each file is uploaded individually.
 */
export async function filesToAttachments(
  files: File[],
  requestId: string,
): Promise<FileAttachment[]> {
  return Promise.all(files.map(file => uploadAttachment(requestId, file)))
}
