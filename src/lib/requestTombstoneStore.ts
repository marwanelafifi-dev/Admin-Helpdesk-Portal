import fs from "fs"
import path from "path"

// A permanent deletion must outlive the recycle bin. Otherwise another
// browser's delayed localStorage sync can recreate a purged request.
const STORE_PATH = path.join(process.cwd(), "data", "request-tombstones.json")

function readIds(): string[] {
  try {
    const value: unknown = JSON.parse(fs.readFileSync(STORE_PATH, "utf-8"))
    return Array.isArray(value) ? value.filter((id): id is string => typeof id === "string") : []
  } catch {
    return []
  }
}

function writeIds(ids: string[]): void {
  fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true })
  const temporary = `${STORE_PATH}.${process.pid}.tmp`
  fs.writeFileSync(temporary, JSON.stringify(ids), "utf-8")
  fs.renameSync(temporary, STORE_PATH)
}

export const requestTombstoneStore = {
  has(id: string): boolean {
    return readIds().includes(id)
  },
  ids(): string[] {
    return readIds()
  },
  record(ids: string[]): void {
    if (!ids.length) return
    writeIds([...new Set([...readIds(), ...ids])])
  },
  remove(id: string): void {
    writeIds(readIds().filter((item) => item !== id))
  },
}
