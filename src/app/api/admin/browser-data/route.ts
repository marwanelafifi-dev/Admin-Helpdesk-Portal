/**
 * Persists a snapshot of the browser's localStorage to data/browser-data.json
 * so that server-side (scheduled) backups capture the full picture.
 *
 * GET  -> returns the last saved browser-data snapshot
 * POST -> accepts { data: Record<string, unknown> } and writes to disk
 *
 * Auth-gated: page:admin-database or manage_users / wildcard.
 */

import { NextRequest, NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import { auth } from "@/auth"

export const runtime = "nodejs"

const DATA_DIR  = path.join(process.cwd(), "data")
const FILE_PATH = path.join(DATA_DIR, "browser-data.json")

function isAuthorized(perms: string[] | undefined): boolean {
  if (!perms) return false
  return perms.includes("*")
      || perms.includes("page:admin-database")
      || perms.includes("manage_users")
}

export async function GET() {
  const session = await auth()
  if (!isAuthorized(session?.user?.permissions as string[] | undefined)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  try {
    if (!fs.existsSync(FILE_PATH)) return NextResponse.json({ data: {} })
    const raw = fs.readFileSync(FILE_PATH, "utf-8")
    return NextResponse.json({ data: JSON.parse(raw) })
  } catch {
    return NextResponse.json({ data: {} })
  }
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
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
    fs.writeFileSync(FILE_PATH, JSON.stringify(body.data, null, 2), "utf-8")
    return NextResponse.json({ ok: true, keys: Object.keys(body.data).length })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 })
  }
}
