import { getPrisma } from "@/server/engine/prisma"
import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  try {
    const prisma = getPrisma()
    const searchParams = req.nextUrl.searchParams
    const format = searchParams.get("format") || "json"
    const days = parseInt(searchParams.get("days") || "30", 10)

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // جلب البيانات
    const requests = await prisma.request.findMany({
      where: {
        createdAt: { gte: startDate },
      },
      include: {
        requester: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    })

    if (format === "csv") {
      // تحويل إلى CSV
      const headers = [
        "Request ID",
        "Module",
        "Title",
        "Status",
        "Requester Name",
        "Requester Email",
        "Created At",
        "Updated At",
        "Days to Complete",
      ]

      const rows = requests.map((r) => {
        const created = new Date(r.createdAt)
        const updated = new Date(r.updatedAt)
        const daysToComplete =
          r.status === "completed"
            ? (updated.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)
            : null

        return [
          r.id,
          r.module,
          `"${r.title.replace(/"/g, '""')}"`, // Escape quotes
          r.status,
          r.requester.name || "",
          r.requester.email || "",
          r.createdAt.toISOString(),
          r.updatedAt.toISOString(),
          daysToComplete ? daysToComplete.toFixed(2) : "",
        ].join(",")
      })

      const csv = [headers.join(","), ...rows].join("\n")

      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="analytics-${new Date().toISOString().split("T")[0]}.csv"`,
        },
      })
    }

    // JSON format (default)
    const summary = {
      period: `Last ${days} days`,
      exportDate: new Date().toISOString(),
      totalRecords: requests.length,
      requests: requests.map((r) => ({
        id: r.id,
        module: r.module,
        title: r.title,
        status: r.status,
        requesterName: r.requester.name,
        requesterEmail: r.requester.email,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
        daysToComplete:
          r.status === "completed"
            ? Math.round(
                ((new Date(r.updatedAt).getTime() -
                  new Date(r.createdAt).getTime()) /
                  (1000 * 60 * 60 * 24)) *
                  100
              ) / 100
            : null,
      })),
    }

    return NextResponse.json(summary)
  } catch (error) {
    console.error("Export analytics error:", error)
    return NextResponse.json(
      { error: "Failed to export analytics" },
      { status: 500 }
    )
  }
}
