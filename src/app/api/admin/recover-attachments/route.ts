/**
 * POST /api/admin/recover-attachments
 *
 * Scans data/attachments/ on disk, finds files that have no entry in
 * attachmentStore (data/attachments.json), and registers them.
 *
 * Useful when files were uploaded successfully to disk but the metadata
 * write failed (e.g. container crash, network timeout during upload).
 *
 * Returns: { recovered: number, skipped: number, details: [...] }
 */

import { NextResponse } from "next/server"
import { auth } from "@/auth"
import fs from "fs"
import path from "path"
import crypto from "crypto"
import { attachmentStore } from "@/lib/attachmentStore"

export const runtime = "nodejs"

const ATTACHMENTS_DIR = path.join(process.cwd(), "data", "attachments")

function calculateChecksum(buffer: Buffer): string {
  return crypto.createHash("sha256").update(buffer).digest("hex")
}

function guessMime(fileName: string): string {
  // Simple extension-based guess without external deps
  const ext = path.extname(fileName).toLowerCase()
  const map: Record<string, string> = {
    ".pdf": "application/pdf",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".xls": "application/vnd.ms-excel",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".zip": "application/zip",
    ".txt": "text/plain",
    ".csv": "text/csv",
  }
  return map[ext] || "application/octet-stream"
}

export async function POST(_req: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Admin-only
  const permissions = (session.user as any).permissions as string[] | undefined
  const isAdmin = permissions?.includes("*") || permissions?.includes("manage_users") || permissions?.includes("page:admin-database")
  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  if (!fs.existsSync(ATTACHMENTS_DIR)) {
    return NextResponse.json({ recovered: 0, skipped: 0, details: [] })
  }

  const existingAttachments = attachmentStore.getAll()
  const existingPaths = new Set(existingAttachments.map((a) => a.filePath))

  const recovered: string[] = []
  const skipped: string[] = []

  // Walk: data/attachments/<year-month>/<requestId>/<filename>
  const dateFolders = fs.readdirSync(ATTACHMENTS_DIR).filter((f) => {
    const full = path.join(ATTACHMENTS_DIR, f)
    return fs.statSync(full).isDirectory()
  })

  for (const dateFolder of dateFolders) {
    const datePath = path.join(ATTACHMENTS_DIR, dateFolder)
    const requestFolders = fs.readdirSync(datePath).filter((f) => {
      return fs.statSync(path.join(datePath, f)).isDirectory()
    })

    for (const requestId of requestFolders) {
      const reqPath = path.join(datePath, requestId)
      const files = fs.readdirSync(reqPath).filter((f) => {
        return fs.statSync(path.join(reqPath, f)).isFile()
      })

      for (const fileName of files) {
        const relativePath = [dateFolder, requestId, fileName].join('/')

        if (existingPaths.has(relativePath)) {
          skipped.push(relativePath)
          continue
        }

        // Register orphaned file
        try {
          const fullPath = path.join(reqPath, fileName)
          const buffer = fs.readFileSync(fullPath)
          const checksum = calculateChecksum(buffer)
          const stats = fs.statSync(fullPath)

          attachmentStore.add({
            id: `att-recovered-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            requestId,
            fileName,
            mimeType: guessMime(fileName),
            sizeBytes: stats.size,
            filePath: relativePath,
            uploadedBy: "recovered",
            uploadedAt: stats.mtime.toISOString(),
            checksum,
          })

          recovered.push(relativePath)
        } catch (err) {
          console.error(`[recover-attachments] Failed to register ${relativePath}:`, err)
        }
      }
    }
  }

  return NextResponse.json({
    recovered: recovered.length,
    skipped: skipped.length,
    details: recovered,
  })
}
