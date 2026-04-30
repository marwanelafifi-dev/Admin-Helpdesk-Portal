import { promises as fs } from "node:fs"
import path from "node:path"

import { z } from "zod"

import type { EngineRequest } from "@/lib/requests-api"

const DbSchema = z.object({
  version: z.number().int(),
  requests: z.array(z.unknown()),
})

type DbFile = {
  version: number
  requests: EngineRequest[]
}

const DB_DIRNAME = ".data"
const DB_FILENAME = "arp-db.json"
const DB_VERSION = 1

function getDbPath(): string {
  return path.join(process.cwd(), DB_DIRNAME, DB_FILENAME)
}

async function ensureDbDir(): Promise<void> {
  const dir = path.join(process.cwd(), DB_DIRNAME)
  await fs.mkdir(dir, { recursive: true })
}

async function atomicWriteFile(filePath: string, contents: string): Promise<void> {
  const tmpPath = `${filePath}.${process.pid}.${Date.now()}.tmp`
  await fs.writeFile(tmpPath, contents, "utf8")
  await fs.rename(tmpPath, filePath)
}

let writeQueue: Promise<void> = Promise.resolve()

async function withWriteLock<T>(fn: () => Promise<T>): Promise<T> {
  const previous = writeQueue
  let release!: () => void
  writeQueue = new Promise<void>((resolve) => {
    release = resolve
  })
  await previous
  try {
    return await fn()
  } finally {
    release()
  }
}

export async function readDb(): Promise<DbFile> {
  const dbPath = getDbPath()
  try {
    const raw = await fs.readFile(dbPath, "utf8")
    const parsed = DbSchema.parse(JSON.parse(raw))
    return {
      version: parsed.version,
      requests: parsed.requests as EngineRequest[],
    }
  } catch (error) {
    const notFound =
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "ENOENT"
    if (!notFound) throw error

    await ensureDbDir()
    const fresh: DbFile = { version: DB_VERSION, requests: [] }
    await atomicWriteFile(dbPath, JSON.stringify(fresh, null, 2))
    return fresh
  }
}

export async function writeDb(next: DbFile): Promise<void> {
  const dbPath = getDbPath()
  await ensureDbDir()
  await withWriteLock(async () => {
    await atomicWriteFile(dbPath, JSON.stringify(next, null, 2))
  })
}

