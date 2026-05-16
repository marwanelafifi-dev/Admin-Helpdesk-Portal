import { getPrisma } from "@/server/engine/prisma"
import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  try {
    const prisma = getPrisma()
    const searchParams = req.nextUrl.searchParams
    const days = parseInt(searchParams.get("days") || "30", 10)

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // إحصائيات استخدام الموارد
    const requests = await prisma.request.findMany({
      where: {
        createdAt: { gte: startDate },
      },
      include: {
        requester: { select: { id: true, name: true, email: true, role: true } },
      },
    })

    // توزيع الطلبات حسب المستخدمين
    const userStats: Record<
      string,
      {
        userId: string
        userName: string
        email: string
        role: string
        totalRequests: number
        completedRequests: number
        activeRequests: number
        avgResolutionDays: number
        loadScore: number
      }
    > = {}

    requests.forEach((req) => {
      const userId = req.requester.id
      const userName = req.requester.name || "Unknown"
      const email = req.requester.email || "unknown@example.com"
      const role = req.requester.role || "employee"

      if (!userStats[userId]) {
        userStats[userId] = {
          userId,
          userName,
          email,
          role,
          totalRequests: 0,
          completedRequests: 0,
          activeRequests: 0,
          avgResolutionDays: 0,
          loadScore: 0,
        }
      }

      userStats[userId].totalRequests++

      if (req.status === "completed") {
        userStats[userId].completedRequests++
      } else if (["new", "on_hold", "in_transit"].includes(req.status)) {
        userStats[userId].activeRequests++
      }

      // حساب متوسط وقت الإنجاز
      if (req.status === "completed") {
        const created = new Date(req.createdAt)
        const updated = new Date(req.updatedAt)
        const daysToComplete =
          (updated.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)
        userStats[userId].avgResolutionDays += daysToComplete
      }
    })

    // معالجة البيانات النهائية
    const userResourceStats = Object.values(userStats)
      .map((u) => ({
        ...u,
        avgResolutionDays:
          u.completedRequests > 0
            ? Math.round((u.avgResolutionDays / u.completedRequests) * 100) / 100
            : 0,
        loadScore: Math.round((u.totalRequests / requests.length) * 100 * 100) / 100,
      }))
      .sort((a, b) => b.totalRequests - a.totalRequests)

    // توزيع الأدوار
    const roleDistribution: Record<
      string,
      {
        role: string
        userCount: number
        totalRequests: number
        avgRequestsPerUser: number
      }
    > = {}

    userResourceStats.forEach((u) => {
      if (!roleDistribution[u.role]) {
        roleDistribution[u.role] = {
          role: u.role,
          userCount: 0,
          totalRequests: 0,
          avgRequestsPerUser: 0,
        }
      }

      roleDistribution[u.role].userCount++
      roleDistribution[u.role].totalRequests += u.totalRequests
    })

    const roleStats = Object.values(roleDistribution)
      .map((r) => ({
        ...r,
        avgRequestsPerUser:
          r.userCount > 0
            ? Math.round((r.totalRequests / r.userCount) * 100) / 100
            : 0,
      }))
      .sort((a, b) => b.totalRequests - a.totalRequests)

    // تحديد المستخدمين ذوي الحمل الأكثر
    const topUsers = userResourceStats.slice(0, 10)

    // حساب استخدام الموارد النسبي
    const avgRequestsPerUser =
      requests.length > 0 && userResourceStats.length > 0
        ? Math.round((requests.length / userResourceStats.length) * 100) / 100
        : 0

    return NextResponse.json({
      period: `Last ${days} days`,
      summary: {
        totalUsers: userResourceStats.length,
        totalRequests: requests.length,
        avgRequestsPerUser,
        maxUserLoad: topUsers[0]?.totalRequests || 0,
        minUserLoad: topUsers[topUsers.length - 1]?.totalRequests || 0,
      },
      userStats: userResourceStats,
      roleStats,
      topLoadedUsers: topUsers,
      generatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Resources analytics error:", error)
    return NextResponse.json(
      { error: "Failed to fetch resources analytics" },
      { status: 500 }
    )
  }
}
