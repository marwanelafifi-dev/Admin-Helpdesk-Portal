import fs from "fs"
import path from "path"

/**
 * Company-wide Document Library metadata for the Intranet portal.
 * File bytes live on disk under data/attachments/<year-month>/<docId>/,
 * written via the same generic `uploadFile()` helper request attachments
 * use (see `fileStorage.ts`) — this store only tracks the metadata.
 * `owner` decides which team's staff can upload/delete a document — see
 * `canManageIntranetContent()` in `functionRegistry.ts`. Read access is
 * open to every authenticated user regardless of owner.
 */
import type { IntranetOwner } from "./quickLinksStore"

export interface IntranetDocument {
  id: string
  title: string
  description?: string
  owner: IntranetOwner
  fileName: string
  mimeType: string
  sizeBytes: number
  filePath: string // relative path from data/attachments
  checksum: string
  uploadedBy: string
  uploadedByEmail: string
  createdAt: string
  updatedAt: string
}

export interface IntranetDocumentsStoreData {
  documents: IntranetDocument[]
}

const STORE_PATH = path.join(process.cwd(), "data", "intranet-documents.json")

const DEFAULT_DATA: IntranetDocumentsStoreData = { documents: [] }

function ensureStore() {
  const dir = path.dirname(STORE_PATH)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  if (!fs.existsSync(STORE_PATH)) {
    fs.writeFileSync(STORE_PATH, JSON.stringify(DEFAULT_DATA, null, 2), "utf-8")
  }
}

function normalizeDocument(doc: Partial<IntranetDocument>): IntranetDocument {
  return {
    id: doc.id ?? `doc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: doc.title ?? "Untitled Document",
    description: doc.description,
    owner: doc.owner ?? "company",
    fileName: doc.fileName ?? "file",
    mimeType: doc.mimeType ?? "application/octet-stream",
    sizeBytes: doc.sizeBytes ?? 0,
    filePath: doc.filePath ?? "",
    checksum: doc.checksum ?? "",
    uploadedBy: doc.uploadedBy ?? "Unknown",
    uploadedByEmail: doc.uploadedByEmail ?? "",
    createdAt: doc.createdAt ?? new Date().toISOString(),
    updatedAt: doc.updatedAt ?? new Date().toISOString(),
  }
}

export function readIntranetDocumentsStore(): IntranetDocumentsStoreData {
  try {
    ensureStore()
    const data = JSON.parse(fs.readFileSync(STORE_PATH, "utf-8"))
    if (!Array.isArray(data?.documents)) return DEFAULT_DATA
    return { documents: data.documents.map(normalizeDocument) }
  } catch {
    return DEFAULT_DATA
  }
}

export function writeIntranetDocumentsStore(data: IntranetDocumentsStoreData) {
  ensureStore()
  fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), "utf-8")
}

export function getAllIntranetDocuments(): IntranetDocument[] {
  return readIntranetDocumentsStore().documents
}

export function getIntranetDocumentById(id: string): IntranetDocument | null {
  return readIntranetDocumentsStore().documents.find((d) => d.id === id) ?? null
}

export function createIntranetDocument(doc: Omit<IntranetDocument, "id" | "createdAt" | "updatedAt">): IntranetDocument {
  const data = readIntranetDocumentsStore()
  const newDoc = normalizeDocument({
    ...doc,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })
  data.documents.unshift(newDoc)
  writeIntranetDocumentsStore(data)
  return newDoc
}

export function updateIntranetDocument(id: string, updates: Partial<IntranetDocument>): IntranetDocument | null {
  const data = readIntranetDocumentsStore()
  const idx = data.documents.findIndex((d) => d.id === id)
  if (idx < 0) return null
  const updated = normalizeDocument({
    ...data.documents[idx],
    ...updates,
    id,
    updatedAt: new Date().toISOString(),
  })
  data.documents[idx] = updated
  writeIntranetDocumentsStore(data)
  return updated
}

export function deleteIntranetDocument(id: string): boolean {
  const data = readIntranetDocumentsStore()
  const before = data.documents.length
  data.documents = data.documents.filter((d) => d.id !== id)
  if (data.documents.length === before) return false
  writeIntranetDocumentsStore(data)
  return true
}
