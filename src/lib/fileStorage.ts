/**
 * File System Storage Manager
 * Handles upload, download, and deletion of request attachments on disk.
 * Organizes files by date and module for easy management and backup.
 */

import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import type { Readable } from 'stream'

export interface StoredFile {
  filePath: string
  checksum: string
  sizeBytes: number
}

const ATTACHMENTS_DIR = path.join(process.cwd(), 'data', 'attachments')

function ensureDir(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true })
  }
}

function getDateFolder(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

function calculateChecksum(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex')
}

export async function uploadFile(
  requestId: string,
  fileName: string,
  buffer: Buffer,
): Promise<StoredFile> {
  ensureDir(ATTACHMENTS_DIR)

  const dateFolder = getDateFolder()
  const requestFolder = path.join(ATTACHMENTS_DIR, dateFolder, requestId)
  ensureDir(requestFolder)

  // Sanitize filename to prevent path traversal
  const sanitizedName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
  const filePath = path.join(requestFolder, sanitizedName)

  // Write file to disk
  fs.writeFileSync(filePath, buffer)

  // Calculate checksum
  const checksum = calculateChecksum(buffer)

  return {
    filePath: path.relative(ATTACHMENTS_DIR, filePath),
    checksum,
    sizeBytes: buffer.length,
  }
}

export function downloadFile(relativePath: string): Buffer {
  const fullPath = path.join(ATTACHMENTS_DIR, relativePath)

  // Ensure the path is within the attachments directory (prevent path traversal)
  const resolved = path.resolve(fullPath)
  if (!resolved.startsWith(path.resolve(ATTACHMENTS_DIR))) {
    throw new Error('Invalid file path')
  }

  if (!fs.existsSync(fullPath)) {
    throw new Error('File not found')
  }

  return fs.readFileSync(fullPath)
}

export function deleteFile(relativePath: string): void {
  const fullPath = path.join(ATTACHMENTS_DIR, relativePath)

  // Ensure the path is within the attachments directory
  const resolved = path.resolve(fullPath)
  if (!resolved.startsWith(path.resolve(ATTACHMENTS_DIR))) {
    throw new Error('Invalid file path')
  }

  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath)

    // Clean up empty directories
    let parentDir = path.dirname(fullPath)
    while (parentDir !== ATTACHMENTS_DIR && fs.existsSync(parentDir)) {
      const files = fs.readdirSync(parentDir)
      if (files.length === 0) {
        fs.rmdirSync(parentDir)
        parentDir = path.dirname(parentDir)
      } else {
        break
      }
    }
  }
}

export function verifyChecksum(relativePath: string, expectedChecksum: string): boolean {
  const buffer = downloadFile(relativePath)
  const actualChecksum = calculateChecksum(buffer)
  return actualChecksum === expectedChecksum
}

export function getFileSize(relativePath: string): number {
  const fullPath = path.join(ATTACHMENTS_DIR, relativePath)
  const resolved = path.resolve(fullPath)

  if (!resolved.startsWith(path.resolve(ATTACHMENTS_DIR))) {
    throw new Error('Invalid file path')
  }

  const stats = fs.statSync(fullPath)
  return stats.size
}
