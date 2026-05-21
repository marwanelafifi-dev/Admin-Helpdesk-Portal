/**
 * Shared attachment helpers used by every module form.
 *
 * Why this matters: attachments must be stored as `data:` URLs (base64)
 * rather than `blob:` URLs. `blob:` URLs only exist inside the browser tab
 * that created them — they break the moment another user opens the request,
 * the original tab is closed, or the file is opened in a new tab. Data URLs
 * are self-contained and work for every viewer in every tab.
 */

export interface AttachmentPayload {
  id: string
  name: string
  url: string           // data: URL
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
 * Convert a list of File objects into serializable AttachmentPayload entries
 * with base64 data URLs. Safe to JSON.stringify and persist.
 */
export async function filesToAttachments(files: File[], idPrefix = "att"): Promise<AttachmentPayload[]> {
  return Promise.all(files.map(async (file, i) => ({
    id: `${idPrefix}-${Date.now()}-${i}`,
    name: file.name,
    url: await fileToDataUrl(file),
    mimeType: file.type || "application/octet-stream",
    sizeBytes: file.size,
    uploadedAt: new Date().toISOString(),
  })))
}
