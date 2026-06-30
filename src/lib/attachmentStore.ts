/**
 * Server-side attachment metadata store
 * Tracks all uploaded files with their metadata for integrity and access control.
 */

import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

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
const ATTACHMENTS_DIR = path.join(process.cwd(), 'data', 'attachments')

const MIME_MAP: Record<string, string> = {
  '.pdf': 'application/pdf', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.zip': 'application/zip', '.txt': 'text/plain', '.csv': 'text/csv',
}

function guessMime(fileName: string): string {
  return MIME_MAP[path.extname(fileName).toLowerCase()] ?? 'application/octet-stream'
}

function scanOrphanedFiles(store: AttachmentMetadata[]): AttachmentMetadata[] {
  if (!fs.existsSync(ATTACHMENTS_DIR)) return store
  const existingPaths = new Set(store.map(a => a.filePath))
  const recovered: AttachmentMetadata[] = []
  try {
    const dateFolders = fs.readdirSync(ATTACHMENTS_DIR).filter(f =>
      fs.statSync(path.join(ATTACHMENTS_DIR, f)).isDirectory()
    )
    for (const dateFolder of dateFolders) {
      const datePath = path.join(ATTACHMENTS_DIR, dateFolder)
      const requestFolders = fs.readdirSync(datePath).filter(f =>
        fs.statSync(path.join(datePath, f)).isDirectory()
      )
      for (const requestId of requestFolders) {
        const reqPath = path.join(datePath, requestId)
        const files = fs.readdirSync(reqPath).filter(f =>
          fs.statSync(path.join(reqPath, f)).isFile()
        )
        for (const fileName of files) {
          const relativePath = [dateFolder, requestId, fileName].join('/')
          if (existingPaths.has(relativePath)) continue
          try {
            const fullPath = path.join(reqPath, fileName)
            const buffer = fs.readFileSync(fullPath)
            const checksum = crypto.createHash('sha256').update(buffer).digest('hex')
            const stats = fs.statSync(fullPath)
            const meta: AttachmentMetadata = {
              id: `att-recovered-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
              requestId,
              fileName,
              mimeType: guessMime(fileName),
              sizeBytes: stats.size,
              filePath: relativePath,
              uploadedBy: 'recovered',
              uploadedAt: stats.mtime.toISOString(),
              checksum,
            }
            recovered.push(meta)
            existingPaths.add(relativePath)
            console.log(`[AttachmentStore] Recovered orphaned file: ${relativePath}`)
          } catch {
            // Skip unreadable files
          }
        }
      }
    }
  } catch (err) {
    console.error('[AttachmentStore] Error scanning for orphaned files:', err)
  }
  return recovered
}

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
    // Auto-recover any files on disk that aren't in the metadata store
    // (e.g. if the server crashed after writing the file but before saving metadata)
    const orphans = scanOrphanedFiles(this.store)
    if (orphans.length > 0) {
      this.store.push(...orphans)
      writeToDisk(this.store)
      console.log(`[AttachmentStore] Auto-recovered ${orphans.length} orphaned file(s)`)
    }
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
