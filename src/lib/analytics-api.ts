// Analytics API client

export interface PerformanceMetrics {
  period: string
  totalRequests: number
  completedRequests: number
  cancelledRequests: number
  overdueRequests: number
  avgResolutionDays: number
  onTimeRate: number
  statusDistribution: Record<string, number>
  moduleDistribution: Record<string, number>
  performanceByModule: Record<
    string,
    {
      total: number
      completed: number
      avgTime: number
      completionRate: number
    }
  >
  generatedAt: string
}

export interface TrendsData {
  period: string
  dailyTrends: Array<{
    date: string
    total: number
    completed: number
    cancelled: number
    new: number
    avgTime: number
  }>
  monthlyTrends: Array<{
    month: string
    total: number
    completed: number
    cancelled: number
    completionRate: number
  }>
  moduleTrends: Array<{
    module: string
    requests: number
    percentage: number
  }>
  totalRequests: number
  generatedAt: string
}

export interface ResourcesData {
  period: string
  summary: {
    totalUsers: number
    totalRequests: number
    avgRequestsPerUser: number
    maxUserLoad: number
    minUserLoad: number
  }
  userStats: Array<{
    userId: string
    userName: string
    email: string
    role: string
    totalRequests: number
    completedRequests: number
    activeRequests: number
    avgResolutionDays: number
    loadScore: number
  }>
  roleStats: Array<{
    role: string
    userCount: number
    totalRequests: number
    avgRequestsPerUser: number
  }>
  topLoadedUsers: Array<{
    userId: string
    userName: string
    email: string
    role: string
    totalRequests: number
    completedRequests: number
    activeRequests: number
    avgResolutionDays: number
    loadScore: number
  }>
  generatedAt: string
}

export async function fetchPerformanceMetrics(
  days: number = 30
): Promise<PerformanceMetrics> {
  const response = await fetch(`/api/analytics/performance?days=${days}`)
  if (!response.ok) {
    throw new Error("Failed to fetch performance metrics")
  }
  return response.json()
}

export async function fetchTrendsData(days: number = 90): Promise<TrendsData> {
  const response = await fetch(`/api/analytics/trends?days=${days}`)
  if (!response.ok) {
    throw new Error("Failed to fetch trends data")
  }
  return response.json()
}

export async function fetchResourcesData(days: number = 30): Promise<ResourcesData> {
  const response = await fetch(`/api/analytics/resources?days=${days}`)
  if (!response.ok) {
    throw new Error("Failed to fetch resources data")
  }
  return response.json()
}

export async function exportAnalytics(
  format: "json" | "csv" = "json",
  days: number = 30
): Promise<Blob> {
  const response = await fetch(
    `/api/analytics/export?format=${format}&days=${days}`
  )
  if (!response.ok) {
    throw new Error("Failed to export analytics")
  }
  return response.blob()
}

export function downloadAnalyticsReport(
  format: "json" | "csv" = "json",
  days: number = 30
) {
  const date = new Date().toISOString().split("T")[0]
  const filename = `analytics-${date}.${format === "csv" ? "csv" : "json"}`

  exportAnalytics(format, days)
    .then((blob) => {
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    })
    .catch((error) => {
      console.error("Download failed:", error)
    })
}
