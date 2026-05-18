import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/options"
import { getPrisma } from "@/server/engine/prisma"
import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const ALLOWED_ROLES = ["super_admin", "admin", "manager"]

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || !ALLOWED_ROLES.includes(session.user.role ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { searchParams } = req.nextUrl
  const format = searchParams.get("format") ?? "json"
  const days = Math.max(1, Math.min(365, parseInt(searchParams.get("days") ?? "90", 10)))

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
  const prisma = getPrisma()

  const requests = await prisma.request.findMany({
    where: { createdAt: { gte: since } },
    select: {
      id: true,
      module: true,
      title: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      requester: { select: { name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 10000,
  })

  const rows = requests.map((r) => {
    const daysToComplete =
      r.status === "completed"
        ? Math.round(((r.updatedAt.getTime() - r.createdAt.getTime()) / 86400000) * 100) / 100
        : null
    return {
      id: r.id,
      module: r.module,
      title: r.title,
      status: r.status,
      requesterName: r.requester.name ?? "",
      requesterEmail: r.requester.email ?? "",
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      daysToComplete,
    }
  })

  const dateLabel = new Date().toISOString().split("T")[0]

  if (format === "csv") {
    const headers = [
      "Request ID", "Module", "Title", "Status",
      "Requester Name", "Requester Email",
      "Created At", "Updated At", "Days to Complete",
    ]
    const csvRows = rows.map((r) =>
      [
        r.id,
        r.module,
        `"${r.title.replace(/"/g, '""')}"`,
        r.status,
        `"${r.requesterName.replace(/"/g, '""')}"`,
        r.requesterEmail,
        r.createdAt,
        r.updatedAt,
        r.daysToComplete ?? "",
      ].join(",")
    )
    const csv = [headers.join(","), ...csvRows].join("\n")

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="analytics-${dateLabel}.csv"`,
      },
    })
  }

  return new NextResponse(
    JSON.stringify({ exportDate: new Date().toISOString(), period: `Last ${days} days`, totalRecords: rows.length, requests: rows }, null, 2),
    {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="analytics-${dateLabel}.json"`,
      },
    }
  )
}
