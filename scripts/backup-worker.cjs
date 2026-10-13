/*
 * Dedicated scheduled-backup process.
 *
 * This intentionally uses only Node built-ins: it runs in its own Docker
 * container, shares the persistent /app/data mount with the portal, and never
 * imports the Next.js server.  Large attachment snapshots therefore cannot
 * block HTTP request handling.
 */
const crypto = require("crypto")
const fs = require("fs")
const path = require("path")

const DATA_DIR = path.join(process.cwd(), "data")
const BACKUP_DIR = path.join(DATA_DIR, "backups")
const ATTACHMENTS_DIR = path.join(DATA_DIR, "attachments")
const SCHEDULE_PATH = path.join(DATA_DIR, "backup-schedule.json")
const JOB_PATH = path.join(DATA_DIR, "backup-job.json")
const LOCK_PATH = path.join(DATA_DIR, ".backup-worker.lock")
const INVENTORY = require("../src/lib/backupInventory.json")
const CHECK_INTERVAL_MS = 60_000
const STALE_LOCK_MS = 6 * 60 * 60 * 1000

const SCHEDULE_DEFAULTS = {
  enabled: false,
  frequencies: ["daily"],
  time: "02:00",
  dayOfWeek: 0,
  dayOfMonth: 1,
  retentionCount: 30,
  lastBackupAt: null,
  lastBackupFile: null,
  lastBackupAttemptAt: null,
  lastBackupStatus: null,
  lastBackupFailureAt: null,
  lastBackupFailureMessage: null,
  consecutiveBackupFailures: 0,
}

function readJson(filePath, fallback = null) {
  try { return JSON.parse(fs.readFileSync(filePath, "utf8")) } catch { return fallback }
}

function writeJsonAtomically(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  const temporary = `${filePath}.${process.pid}.${Date.now()}.tmp`
  fs.writeFileSync(temporary, JSON.stringify(value, null, 2), "utf8")
  fs.renameSync(temporary, filePath)
}

function readSchedule() {
  const saved = readJson(SCHEDULE_PATH, {})
  const source = saved && typeof saved === "object" && !Array.isArray(saved) ? saved : {}
  const frequencies = Array.isArray(source.frequencies)
    ? source.frequencies.filter((item) => ["hourly", "daily", "weekly", "monthly"].includes(item))
    : []
  return {
    ...SCHEDULE_DEFAULTS,
    ...source,
    enabled: Boolean(source.enabled),
    frequencies: [...new Set(frequencies.length ? frequencies : source.frequency ? [source.frequency] : SCHEDULE_DEFAULTS.frequencies)],
  }
}

function writeSchedule(patch) {
  const current = readSchedule()
  const next = { ...current, ...patch }
  if (patch.lastBackupAt) {
    next.lastBackupAttemptAt = patch.lastBackupAt
    next.lastBackupStatus = "success"
    next.lastBackupFailureAt = null
    next.lastBackupFailureMessage = null
    next.consecutiveBackupFailures = 0
  }
  writeJsonAtomically(SCHEDULE_PATH, next)
  return next
}

function recordBackupFailure(error) {
  const current = readSchedule()
  const now = new Date().toISOString()
  const message = String(error && error.message ? error.message : error || "Unknown backup error")
    .replace(/[\r\n\t]+/g, " ").trim().slice(0, 500) || "Unknown backup error"
  writeSchedule({
    lastBackupAttemptAt: now,
    lastBackupStatus: "failure",
    lastBackupFailureAt: now,
    lastBackupFailureMessage: message,
    consecutiveBackupFailures: Number(current.consecutiveBackupFailures || 0) + 1,
  })
}

function isDueForFrequency(frequency, now, last, schedule) {
  if (frequency === "hourly") return !last || now.getTime() - last.getTime() >= 60 * 60 * 1000
  const [hour, minute] = String(schedule.time || "02:00").split(":").map(Number)
  const scheduledToday = new Date(now)
  scheduledToday.setHours(hour, minute, 0, 0)
  if (frequency === "daily") return (!last && now >= scheduledToday) || Boolean(last && now >= scheduledToday && last < scheduledToday)
  if (frequency === "weekly") return now.getDay() === Number(schedule.dayOfWeek) && ((!last && now >= scheduledToday) || Boolean(last && now >= scheduledToday && last < scheduledToday))
  if (frequency === "monthly") return now.getDate() === Number(schedule.dayOfMonth) && ((!last && now >= scheduledToday) || Boolean(last && now >= scheduledToday && last < scheduledToday))
  return false
}

function shouldRunNow(schedule) {
  if (!schedule.enabled) return false
  const last = schedule.lastBackupAt ? new Date(schedule.lastBackupAt) : null
  const validLast = last && !Number.isNaN(last.getTime()) ? last : null
  const now = new Date()
  return schedule.frequencies.some((frequency) => isDueForFrequency(frequency, now, validLast, schedule))
}

function makeBackupFilename(date) {
  const day = String(date.getDate()).padStart(2, "0")
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const year = date.getFullYear()
  let hour = date.getHours()
  const minute = String(date.getMinutes()).padStart(2, "0")
  const second = String(date.getSeconds()).padStart(2, "0")
  const ampm = hour >= 12 ? "PM" : "AM"
  hour = hour % 12 || 12
  return `Backup-${day}-${month}-${year} - ${String(hour).padStart(2, "0")}.${minute}.${second} ${ampm}.json`
}

function collectAttachments(directory, prefix = "") {
  if (!fs.existsSync(directory)) return []
  const files = []
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name
    const filePath = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      files.push(...collectAttachments(filePath, relative))
    } else if (entry.isFile()) {
      const buffer = fs.readFileSync(filePath)
      files.push({
        path: relative,
        contentBase64: buffer.toString("base64"),
        sizeBytes: buffer.length,
        checksum: crypto.createHash("sha256").update(buffer).digest("hex"),
      })
    }
  }
  return files
}

function integrityFor(manifest) {
  const payload = JSON.stringify(manifest)
  const checksum = crypto.createHash("sha256").update(payload, "utf8").digest("hex")
  const key = (process.env.BACKUP_INTEGRITY_KEY || process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "").trim()
  const integrity = { version: 1, checksumAlgorithm: "sha256", checksum }
  if (key) {
    integrity.signatureAlgorithm = "hmac-sha256"
    integrity.signature = crypto.createHmac("sha256", key).update(payload, "utf8").digest("hex")
  }
  return integrity
}

function verifyWrittenBackup(filepath) {
  const parsed = readJson(filepath)
  if (!parsed || typeof parsed !== "object" || !parsed.integrity) throw new Error("Backup verification could not read integrity metadata")
  const { integrity, ...unsigned } = parsed
  const expected = integrityFor(unsigned)
  if (integrity.checksum !== expected.checksum || (expected.signature && integrity.signature !== expected.signature)) {
    throw new Error("Backup integrity verification failed")
  }
}

function listBackups() {
  if (!fs.existsSync(BACKUP_DIR)) return []
  return fs.readdirSync(BACKUP_DIR)
    .filter((file) => file.endsWith(".json"))
    .map((filename) => ({ filename, mtime: fs.statSync(path.join(BACKUP_DIR, filename)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime)
}

function pruneOldBackups(retentionCount) {
  if (!Number.isInteger(retentionCount) || retentionCount <= 0) return 0
  const remove = listBackups().slice(retentionCount)
  for (const item of remove) fs.unlinkSync(path.join(BACKUP_DIR, item.filename))
  return remove.length
}

function runBackup() {
  fs.mkdirSync(BACKUP_DIR, { recursive: true })
  const serverData = {}
  for (const file of INVENTORY) {
    const value = readJson(path.join(DATA_DIR, file.filename))
    if (value !== null) serverData[file.filename] = value
  }
  const attachmentFiles = collectAttachments(ATTACHMENTS_DIR)
  const unsigned = {
    version: "1.2",
    createdAt: new Date().toISOString(),
    createdBy: "scheduled-backup-worker",
    data: {},
    serverData,
    attachmentFiles,
  }
  const manifest = { ...unsigned, integrity: integrityFor(unsigned) }
  const filename = makeBackupFilename(new Date())
  const filepath = path.join(BACKUP_DIR, filename)
  const temporary = `${filepath}.${process.pid}.partial`
  const content = JSON.stringify(manifest, null, 2)
  fs.writeFileSync(temporary, content, "utf8")
  try {
    verifyWrittenBackup(temporary)
    fs.renameSync(temporary, filepath)
  } catch (error) {
    try { fs.unlinkSync(temporary) } catch {}
    throw error
  }
  const schedule = readSchedule()
  const pruned = pruneOldBackups(Number(schedule.retentionCount))
  writeSchedule({ lastBackupAt: new Date().toISOString(), lastBackupFile: filename })
  return { filename, sizeBytes: Buffer.byteLength(content), attachmentFiles: attachmentFiles.length, serverFiles: Object.keys(serverData).length, pruned }
}

function readJob() {
  const job = readJson(JOB_PATH)
  return job && typeof job === "object" && job.source === "manual" ? job : null
}

function writeJob(job) { writeJsonAtomically(JOB_PATH, job) }

function acquireLock() {
  fs.mkdirSync(DATA_DIR, { recursive: true })
  try {
    const descriptor = fs.openSync(LOCK_PATH, "wx")
    fs.writeFileSync(descriptor, JSON.stringify({ pid: process.pid, acquiredAt: new Date().toISOString() }))
    fs.closeSync(descriptor)
    return true
  } catch (error) {
    if (error.code !== "EEXIST") throw error
    try {
      if (Date.now() - fs.statSync(LOCK_PATH).mtimeMs > STALE_LOCK_MS) {
        fs.unlinkSync(LOCK_PATH)
        return acquireLock()
      }
    } catch {}
    return false
  }
}

function releaseLock() { try { fs.unlinkSync(LOCK_PATH) } catch {} }

let running = false
function tick() {
  if (running || !acquireLock()) return
  const job = readJob()
  const schedule = readSchedule()
  const manual = job && job.status === "queued"
  const scheduled = !manual && shouldRunNow(schedule)
  if (!manual && !scheduled) { releaseLock(); return }

  running = true
  const startedAt = new Date().toISOString()
  if (manual) writeJob({ ...job, status: "running", startedAt, error: undefined })
  console.log(`[backup-worker] Starting ${manual ? "manual" : "scheduled"} backup`)
  const started = Date.now()
  try {
    const result = runBackup()
    const durationMs = Date.now() - started
    console.log(`[backup-worker] Completed ${result.filename} (${result.sizeBytes} bytes, ${result.attachmentFiles} attachments) in ${durationMs}ms`)
    if (manual) writeJob({ ...job, status: "completed", startedAt, completedAt: new Date().toISOString(), ...result })
  } catch (error) {
    const message = String(error && error.message ? error.message : error || "Unknown backup error")
    console.error("[backup-worker] Backup failed:", message)
    recordBackupFailure(error)
    if (manual) writeJob({ ...job, status: "failed", startedAt, completedAt: new Date().toISOString(), error: message.slice(0, 500) })
  } finally {
    running = false
    releaseLock()
  }
}

console.log("[backup-worker] Started; checking every minute in an isolated process")
setTimeout(tick, 15_000)
setInterval(tick, CHECK_INTERVAL_MS)
