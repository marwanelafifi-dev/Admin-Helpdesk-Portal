import { randomUUID } from "crypto"
import fs from "fs"
import path from "path"

const STORE_PATH = path.join(process.cwd(), "data", "google-sheets-exports.json")
const JOB_TTL_MS = 15 * 60 * 1000
const MAX_JOBS = 20

export interface GoogleSheetsExportJob {
  id: string
  userId: string
  actor: string
  actorEmail: string
  scope: string
  modules: string[]
  requestCount: number
  title: string
  values: string[][]
  createdAt: string
}

function readJobs(): GoogleSheetsExportJob[] {
  try {
    const directory = path.dirname(STORE_PATH)
    if (!fs.existsSync(directory)) fs.mkdirSync(directory, { recursive: true })
    if (!fs.existsSync(STORE_PATH)) return []
    const parsed = JSON.parse(fs.readFileSync(STORE_PATH, "utf-8"))
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeJobs(jobs: GoogleSheetsExportJob[]) {
  const directory = path.dirname(STORE_PATH)
  if (!fs.existsSync(directory)) fs.mkdirSync(directory, { recursive: true })
  fs.writeFileSync(STORE_PATH, JSON.stringify(jobs, null, 2), "utf-8")
}

function activeJobs(jobs = readJobs(), now = Date.now()) {
  return jobs.filter((job) => now - new Date(job.createdAt).getTime() < JOB_TTL_MS)
}

/** Stores an export just long enough to complete the Google OAuth redirect. */
export function createGoogleSheetsExportJob(input: Omit<GoogleSheetsExportJob, "id" | "createdAt">) {
  const job: GoogleSheetsExportJob = { ...input, id: randomUUID(), createdAt: new Date().toISOString() }
  writeJobs([job, ...activeJobs()].slice(0, MAX_JOBS))
  return job
}

/** State values are single-use and bound to the portal user who initiated them. */
export function consumeGoogleSheetsExportJob(id: string, userId: string): GoogleSheetsExportJob | null {
  const jobs = activeJobs()
  const index = jobs.findIndex((job) => job.id === id && job.userId === userId)
  if (index < 0) {
    writeJobs(jobs)
    return null
  }
  const [job] = jobs.splice(index, 1)
  writeJobs(jobs)
  return job
}
