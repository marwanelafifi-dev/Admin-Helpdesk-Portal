import fs from "fs"
import path from "path"
import { NextRequest, NextResponse } from "next/server"
import { getToken } from "@auth/core/jwt"

export const runtime = "nodejs"

const ICON_DIRECTORY = path.join(process.cwd(), "data", "support-function-icons")
const validIds = new Set(["administration", "people", "finance", "it"])

async function isSettingsAdmin(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET, secureCookie: req.nextUrl.protocol === "https:" })
  const permissions = (token?.permissions as string[]) ?? []
  return Boolean(token) && (token?.role === "Full Access" || permissions.includes("settings") || permissions.includes("*"))
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!validIds.has(params.id)) return NextResponse.json({ error: "Invalid support function." }, { status: 400 })
  if (!await isSettingsAdmin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  try {
    const file = (await req.formData()).get("file")
    if (!(file instanceof File) || !["image/png", "image/jpeg"].includes(file.type) || file.size > 5 * 1024 * 1024) return NextResponse.json({ error: "Upload a PNG or JPG image up to 5 MB." }, { status: 400 })
    fs.mkdirSync(ICON_DIRECTORY, { recursive: true })
    for (const extension of ["png", "jpg"]) {
      const existing = path.join(ICON_DIRECTORY, `${params.id}.${extension}`)
      if (fs.existsSync(existing)) fs.unlinkSync(existing)
    }
    const extension = file.type === "image/png" ? "png" : "jpg"
    fs.writeFileSync(path.join(ICON_DIRECTORY, `${params.id}.${extension}`), Buffer.from(await file.arrayBuffer()))
    return NextResponse.json({ url: `/api/admin/support-function-icons/${params.id}?v=${Date.now()}` })
  } catch {
    return NextResponse.json({ error: "Unable to upload this logo." }, { status: 500 })
  }
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  if (!validIds.has(params.id)) return NextResponse.json({ error: "Invalid support function." }, { status: 400 })
  for (const [extension, contentType] of [["png", "image/png"], ["jpg", "image/jpeg"]] as const) {
    const filePath = path.join(ICON_DIRECTORY, `${params.id}.${extension}`)
    if (fs.existsSync(filePath)) return new NextResponse(fs.readFileSync(filePath), { headers: { "Content-Type": contentType, "Cache-Control": "private, max-age=31536000, immutable" } })
  }
  return NextResponse.json({ error: "Logo not found." }, { status: 404 })
}
