import crypto from "crypto"
import fs from "fs"
import path from "path"

const DATA_DIR = path.join(process.cwd(), "data")
const JOB_PATH = path.join(DATA_DIR, "backup-job.json")

export type BackupJobStatus = "queued" | "running" | "completed" | "failed"

export interface BackupJob {
  id: string
  source: "manual"
  status: BackupJobStatus
  requestedAt: string
  startedAt?: string
  completedAt?: string
  filename?: string
  sizeBytes?: number
  attachmentFiles?: number
  error?: string
}

function readRaw(): BackupJob | null {
  try {
    const parsed = JSON.parse(fs.readFileSync(JOB_PATH, "utf8")) as Partial<BackupJob>
    if (!parsed || typeof parsed.id !== "string" || parsed.source !== "manual") return null
    if (!["queued", "running", "completed", "failed"].includes(String(parsed.status))) return null
    return parsed as BackupJob
  } catch {
    return null
  }
}

function write(job: BackupJob) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
  const temporary = `${JOB_PATH}.${process.pid}.${Date.now()}.tmp`
  fs.writeFileSync(temporary, JSON.stringify(job, null, 2), "utf8")
  fs.renameSync(temporary, JOB_PATH)
}

/** Queue one manual backup. A queued/running job is reused instead of creating overlap. */
export function queueManualBackup(): { job: BackupJob; alreadyQueued: boolean } {
  const current = readRaw()
  if (current && (current.status === "queued" || current.status === "running")) {
    return { job: current, alreadyQueued: true }
  }
  const job: BackupJob = {
    id: crypto.randomUUID(),
    source: "manual",
    status: "queued",
    requestedAt: new Date().toISOString(),
  }
  write(job)
  return { job, alreadyQueued: false }
}

export function readBackupJob(): BackupJob | null {
  return readRaw()
}
