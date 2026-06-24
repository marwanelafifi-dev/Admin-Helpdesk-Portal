/**
 * Server-side attachment metadata store
 * Tracks all uploaded files with their metadata for integrity and access control.
 */

import fs from 'fs'
import path from 'path'

export interface AttachmentMetadata {
  id: string
  requestId: string
  fileName: string
  mimeType: string
  sizeBytes: number
  filePath: string // relative path from /app/attachments
  uploadedBy: string
  uploadedAt: string
  checksum: string
}

const STORE_PATH = path.join(process.cwd(), 'data', 'attachments.json')

function ensureStore() {
  const dir = path.dirname(STORE_PATH)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  if (!fs.existsSync(STORE_PATH)) fs.writeFileSync(STORE_PATH, JSON.stringify([]), 'utf-8')
}

function readFromDisk(): AttachmentMetadata[] {
  try {
    ensureStore()
    const raw = fs.readFileSync(STORE_PATH, 'utf-8')
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeToDisk(data: AttachmentMetadata[]) {
  ensureStore()
  fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), 'utf-8')
}

class AttachmentStore {
  private store: AttachmentMetadata[] = []

  constructor() {
    this.store = readFromDisk()
  }

  getAll(): AttachmentMetadata[] {
    return [...this.store]
  }

  getByRequestId(requestId: string): AttachmentMetadata[] {
    return this.store.filter(att => att.requestId === requestId)
  }

  getById(id: string): AttachmentMetadata | undefined {
    return this.store.find(att => att.id === id)
  }

  add(metadata: AttachmentMetadata): AttachmentMetadata {
    this.store.push(metadata)
    writeToDisk(this.store)
    return metadata
  }

  delete(id: string): void {
    const index = this.store.findIndex(att => att.id === id)
    if (index !== -1) {
      this.store.splice(index, 1)
      writeToDisk(this.store)
    }
  }

  deleteByRequestId(requestId: string): void {
    const before = this.store.length
    this.store = this.store.filter(att => att.requestId !== requestId)
    if (this.store.length !== before) {
      writeToDisk(this.store)
    }
  }

  clear(): void {
    this.store = []
    writeToDisk(this.store)
  }
}

export const attachmentStore = new AttachmentStore()
