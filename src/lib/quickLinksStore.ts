import fs from "fs"
import path from "path"

/**
 * Company-wide Quick Links directory for the Intranet portal.
 * `owner` decides which team's staff can add/edit/delete a link — see
 * `canManageIntranetContent()` in `functionRegistry.ts`. Read access is
 * open to every authenticated user regardless of owner.
 */
export type { IntranetOwner } from "@/lib/functionRegistry"
import type { IntranetOwner } from "@/lib/functionRegistry"

export interface QuickLink {
  id: string
  title: string
  description?: string
  url: string
  icon?: string
  owner: IntranetOwner
  createdBy: string
  createdByEmail: string
  createdAt: string
  updatedAt: string
}

export interface QuickLinksStoreData {
  links: QuickLink[]
}

const STORE_PATH = path.join(process.cwd(), "data", "quick-links.json")

const DEFAULT_DATA: QuickLinksStoreData = { links: [] }

function ensureStore() {
  const dir = path.dirname(STORE_PATH)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  if (!fs.existsSync(STORE_PATH)) {
    fs.writeFileSync(STORE_PATH, JSON.stringify(DEFAULT_DATA, null, 2), "utf-8")
  }
}

function normalizeLink(link: Partial<QuickLink>): QuickLink {
  return {
    id: link.id ?? `link-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: link.title ?? "Untitled Link",
    description: link.description,
    url: link.url ?? "",
    icon: link.icon,
    owner: link.owner ?? "company",
    createdBy: link.createdBy ?? "Unknown",
    createdByEmail: link.createdByEmail ?? "",
    createdAt: link.createdAt ?? new Date().toISOString(),
    updatedAt: link.updatedAt ?? new Date().toISOString(),
  }
}

export function readQuickLinksStore(): QuickLinksStoreData {
  try {
    ensureStore()
    const data = JSON.parse(fs.readFileSync(STORE_PATH, "utf-8"))
    if (!Array.isArray(data?.links)) return DEFAULT_DATA
    return { links: data.links.map(normalizeLink) }
  } catch {
    return DEFAULT_DATA
  }
}

export function writeQuickLinksStore(data: QuickLinksStoreData) {
  ensureStore()
  fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), "utf-8")
}

export function getAllQuickLinks(): QuickLink[] {
  return readQuickLinksStore().links
}

export function getQuickLinkById(id: string): QuickLink | null {
  return readQuickLinksStore().links.find((l) => l.id === id) ?? null
}

export function createQuickLink(link: Omit<QuickLink, "id" | "createdAt" | "updatedAt">): QuickLink {
  const data = readQuickLinksStore()
  const newLink = normalizeLink({
    ...link,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })
  data.links.unshift(newLink)
  writeQuickLinksStore(data)
  return newLink
}

export function updateQuickLink(id: string, updates: Partial<QuickLink>): QuickLink | null {
  const data = readQuickLinksStore()
  const idx = data.links.findIndex((l) => l.id === id)
  if (idx < 0) return null
  const updated = normalizeLink({
    ...data.links[idx],
    ...updates,
    id,
    updatedAt: new Date().toISOString(),
  })
  data.links[idx] = updated
  writeQuickLinksStore(data)
  return updated
}

export function deleteQuickLink(id: string): boolean {
  const data = readQuickLinksStore()
  const before = data.links.length
  data.links = data.links.filter((l) => l.id !== id)
  if (data.links.length === before) return false
  writeQuickLinksStore(data)
  return true
}
