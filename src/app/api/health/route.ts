import { NextResponse } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** Docker readiness probe: verifies the Next.js process can answer HTTP. */
export async function GET() {
  return NextResponse.json({ status: "ok" }, {
    headers: { "Cache-Control": "no-store" },
  })
}
