import { getPrisma } from "@/server/engine/prisma"
import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  try {
    const prisma = getPrisma()
    const searchParams = req.nextUrl.searchParams
    const days = parseInt(searchParams.get("days") || "90", 10)

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // جلب البيانات حسب الأيام
    const requests = await prisma.request.findMany({
      where: {
        createdAt: { gte: startDate },
      },
      select: {
        id: true,
        module: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "asc" },
    })

    // تجميع البيانات حسب الأيام
    const dailyTrends: Record<
      string,
      {
        date: string
        total: number
        completed: number
        cancelled: number
        new: number
        avgTime: number
      }
    > = {}

    requests.forEach((req) => {
      const dateKey = req.createdAt.toISOString().split("T")[0]

      if (!dailyTrends[dateKey]) {
        dailyTrends[dateKey] = {
          date: dateKey,
          total: 0,
          completed: 0,
          cancelled: 0,
          new: 0,
          avgTime: 0,
        }
      }

      dailyTrends[dateKey].total++
      if (req.status === "completed") dailyTrends[dateKey].completed++
      if (req.status === "cancelled") dailyTrends[dateKey].cancelled++
      if (req.status === "new") dailyTrends[dateKey].new++

      if (req.status === "completed") {
        const created = new Date(req.createdAt)
        const updated = new Date(req.updatedAt)
        const daysToComplete =
          (updated.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)
        dailyTrends[dateKey].avgTime += daysToComplete
      }
    })

    // تحويل إلى مصفوفة ومعالجة القيم
    const trendData = Object.values(dailyTrends)
      .map((d) => ({
        ...d,
        avgTime: Math.round(d.avgTime * 100) / 100,
      }))
      .slice(-days)

    // حساب الاتجاهات الشهرية
    const monthlyTrends: Record<
      string,
      {
        month: string
        total: number
        completed: number
        cancelled: number
        completionRate: number
      }
    > = {}

    requests.forEach((req) => {
      const month = req.createdAt.toISOString().split("T")[0].slice(0, 7)

      if (!monthlyTrends[month]) {
        monthlyTrends[month] = {
          month,
          total: 0,
          completed: 0,
          cancelled: 0,
          completionRate: 0,
        }
      }

      monthlyTrends[month].total++
      if (req.status === "completed") monthlyTrends[month].completed++
      if (req.status === "cancelled") monthlyTrends[month].cancelled++
    })

    const monthlyData = Object.values(monthlyTrends)
      .map((m) => ({
        ...m,
        completionRate:
          m.total > 0 ? Math.round((m.completed / m.total) * 100 * 100) / 100 : 0,
      }))
      .sort((a, b) => a.month.localeCompare(b.month))

    // اتجاهات الوحدات
    const moduleRequests: Record<string, number> = {}
    requests.forEach((req) => {
      moduleRequests[req.module] = (moduleRequests[req.module] || 0) + 1
    })

    const moduleTrends = Object.entries(moduleRequests)
      .map(([module, count]) => ({
        module,
        requests: count,
        percentage: Math.round((count / requests.length) * 100 * 100) / 100,
      }))
      .sort((a, b) => b.requests - a.requests)

    return NextResponse.json({
      period: `Last ${days} days`,
      dailyTrends: trendData,
      monthlyTrends: monthlyData,
      moduleTrends,
      totalRequests: requests.length,
      generatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Trends analytics error:", error)
    return NextResponse.json(
      { error: "Failed to fetch trends analytics" },
      { status: 500 }
    )
  }
}
