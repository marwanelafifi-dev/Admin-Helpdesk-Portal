/**
 * Server-side data bundle used by the Admin > Database page.
 *
 * GET    -> returns everything that lives in /app/data on the server
 *           (comments, feedback, users, roles) as a single JSON object so
 *           backups can capture it alongside the user's browser localStorage.
 * POST   -> writes those files back from an uploaded backup.
 * DELETE -> clears the user-data files (comments, feedback). Users and
 *           roles are intentionally preserved so admins can't accidentally
 *           lock everyone out of the platform via the Clear All button.
 *
 * Auth-gated: only callers with manage_users or the page:admin-database
 * permission (i.e. Administration Team / Full Access) can hit this.
 */

import { NextRequest, NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import { auth } from "@/auth"

export const runtime = "nodejs"

const DATA_DIR = path.join(process.cwd(), "data")

interface ServerDataFile {
  filename: string
  /** True if Clear All / restore should overwrite this file. */
  user_data: boolean
  /** True if this file should be wiped on Clear by Data Type "Clear All". */
  clearable: boolean
}

const FILES: ServerDataFile[] = [
  { filename: "comments.json",     user_data: true,  clearable: true  },
  { filename: "feedback.json",     user_data: true,  clearable: true  },
  { filename: "announcements.json", user_data: true,  clearable: true  },
  { filename: "requests.json",     user_data: true,  clearable: true  },
  { filename: "company-data.json", user_data: true,  clearable: true  },
  { filename: "notices.json",      user_data: true,  clearable: true  },
  { filename: "user-feedback.json", user_data: true,  clearable: true  },
  { filename: "admin-survey.json",  user_data: true,  clearable: true  },
  // Never clear these — admins would lock themselves out.
  { filename: "users.json",        user_data: true,  clearable: false },
  { filename: "roles.json",        user_data: true,  clearable: false },
]

function isAuthorized(perms: string[] | undefined): boolean {
  if (!perms) return false
  return perms.includes("*")
      || perms.includes("page:admin-database")
      || perms.includes("manage_users")
}

function readFileSafe(filename: string): unknown {
  try {
    const fullPath = path.join(DATA_DIR, filename)
    if (!fs.existsSync(fullPath)) return null
    const raw = fs.readFileSync(fullPath, "utf-8")
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function writeFileSafe(filename: string, contents: unknown): boolean {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
    fs.writeFileSync(path.join(DATA_DIR, filename), JSON.stringify(contents, null, 2), "utf-8")
    return true
  } catch (err) {
    console.error(`[admin/server-data] Failed to write ${filename}:`, err)
    return false
  }
}

export async function GET() {
  const session = await auth()
  if (!isAuthorized(session?.user?.permissions as string[] | undefined)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const bundle: Record<string, unknown> = {}
  for (const f of FILES) {
    if (!f.user_data) continue
    const data = readFileSafe(f.filename)
    if (data !== null) bundle[f.filename] = data
  }
  return NextResponse.json({ data: bundle })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!isAuthorized(session?.user?.permissions as string[] | undefined)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  let body: { data?: Record<string, unknown> }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 })
  }
  if (!body.data || typeof body.data !== "object") {
    return NextResponse.json({ error: "missing_data" }, { status: 400 })
  }

  const restored: string[] = []
  const skipped: string[] = []
  for (const f of FILES) {
    if (!f.user_data) continue
    if (!(f.filename in body.data)) {
      skipped.push(f.filename)
      continue
    }
    if (writeFileSafe(f.filename, body.data[f.filename])) {
      restored.push(f.filename)
    } else {
      skipped.push(f.filename)
    }
  }
  return NextResponse.json({ restored, skipped })
}

export async function DELETE() {
  const session = await auth()
  if (!isAuthorized(session?.user?.permissions as string[] | undefined)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const cleared: string[] = []
  for (const f of FILES) {
    if (!f.clearable) continue
    // Reset to an empty shape — comments uses {} (Record<requestId, []>),
    // feedback uses { surveys: [], responses: [] }, requests uses [] (array),
    // company-data uses the canonical object with empty arrays per key.
    const emptyShape: unknown =
      f.filename === "feedback.json" ? { surveys: [], responses: [] } :
      f.filename === "announcements.json" ? { sent: [], drafts: [], templates: [] } :
      f.filename === "requests.json" ? [] :
      f.filename === "company-data.json" ? {
        suppliers: [], cost_centers: [], managers: [],
        carriers: [], departments: [], sectors: [],
      } :
      {}
    if (writeFileSafe(f.filename, emptyShape)) cleared.push(f.filename)
  }
  return NextResponse.json({ cleared })
}
