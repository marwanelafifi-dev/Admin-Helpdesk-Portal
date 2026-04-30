import { NextResponse } from "next/server"

import { readDb, writeDb } from "@/server/engine/db"
import { getSeedRequests } from "@/server/engine/seed"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 })
  }

  const url = new URL(request.url)
  const force = url.searchParams.get("force") === "1"

  const db = await readDb()
  if (db.requests.length > 0 && !force) {
    return NextResponse.json(
      { ok: false, error: "DB already has data. Pass ?force=1 to overwrite." },
      { status: 409 }
    )
  }

  db.requests = getSeedRequests()
  await writeDb(db)
  return NextResponse.json({ ok: true, count: db.requests.length })
}

