import { getPrisma } from "@/server/engine/prisma"
import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  try {
    const prisma = getPrisma()
    const searchParams = req.nextUrl.searchParams
    const days = parseInt(searchParams.get("days") || "30", 10)

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // إحصائيات الأداء
    const requests = await prisma.request.findMany({
      where: {
        createdAt: { gte: startDate },
      },
      include: {
        requester: { select: { id: true, name: true, email: true } },
      },
    })

    // حساب مقاييس الأداء
    const totalRequests = requests.length
    const completedRequests = requests.filter(
      (r) => r.status === "completed"
    ).length
    const cancelledRequests = requests.filter(
      (r) => r.status === "cancelled"
    ).length
    const overdueRequests = requests.filter((r) => {
      const createdDate = new Date(r.createdAt)
      const daysOld = (Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24)
      return (
        daysOld > 7 &&
        !["completed", "cancelled", "delivered"].includes(r.status)
      )
    }).length

    // متوسط وقت الإنجاز (الطلبات المكتملة فقط)
    const completedReqs = requests.filter((r) => r.status === "completed")
    let avgResolutionDays = 0
    if (completedReqs.length > 0) {
      const resolutionTimes = completedReqs.map((r) => {
        const created = new Date(r.createdAt)
        const updated = new Date(r.updatedAt)
        return (updated.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)
      })
      avgResolutionDays =
        resolutionTimes.reduce((a, b) => a + b, 0) / completedReqs.length
    }

    // توزيع الحالات
    const statusDistribution = {
      draft: requests.filter((r) => r.status === "draft").length,
      new: requests.filter((r) => r.status === "new").length,
      on_hold: requests.filter((r) => r.status === "on_hold").length,
      in_transit: requests.filter((r) => r.status === "in_transit").length,
      delivered: requests.filter((r) => r.status === "delivered").length,
      completed: completedRequests,
      cancelled: cancelledRequests,
    }

    // توزيع الوحدات
    const moduleDistribution: Record<string, number> = {}
    requests.forEach((r) => {
      moduleDistribution[r.module] = (moduleDistribution[r.module] || 0) + 1
    })

    // معدل الإنجاز في الوقت المحدد (على افتراض 5 أيام مستهدفة)
    const onTimeRequests = completedReqs.filter((r) => {
      const created = new Date(r.createdAt)
      const updated = new Date(r.updatedAt)
      const daysToComplete =
        (updated.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)
      return daysToComplete <= 5
    }).length
    const onTimeRate =
      completedReqs.length > 0 ? (onTimeRequests / completedReqs.length) * 100 : 0

    // أداء حسب الوحدة
    const performanceByModule: Record<
      string,
      {
        total: number
        completed: number
        avgTime: number
        completionRate: number
      }
    > = {}

    Object.keys(moduleDistribution).forEach((module) => {
      const moduleRequests = requests.filter((r) => r.module === module)
      const moduleCompleted = moduleRequests.filter(
        (r) => r.status === "completed"
      )
      const avgTime =
        moduleCompleted.length > 0
          ? moduleCompleted.reduce((sum, r) => {
              const created = new Date(r.createdAt)
              const updated = new Date(r.updatedAt)
              return (
                sum +
                (updated.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)
              )
            }, 0) / moduleCompleted.length
          : 0

      performanceByModule[module] = {
        total: moduleRequests.length,
        completed: moduleCompleted.length,
        avgTime: Math.round(avgTime * 100) / 100,
        completionRate:
          moduleRequests.length > 0
            ? (moduleCompleted.length / moduleRequests.length) * 100
            : 0,
      }
    })

    return NextResponse.json({
      period: `Last ${days} days`,
      totalRequests,
      completedRequests,
      cancelledRequests,
      overdueRequests,
      avgResolutionDays: Math.round(avgResolutionDays * 100) / 100,
      onTimeRate: Math.round(onTimeRate * 100) / 100,
      statusDistribution,
      moduleDistribution,
      performanceByModule,
      generatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Analytics error:", error)
    return NextResponse.json(
      { error: "Failed to fetch performance analytics" },
      { status: 500 }
    )
  }
}
