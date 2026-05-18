export interface DashboardRequest {
  id: string
  module: string
  title: string
  status: string
  payload: Record<string, unknown>
  statusHistory: Array<{
    status: string
    changedBy: string
    changedAt: string
    comment?: string
  }>
  requesterId: string
  requesterName: string
  requesterEmail: string
  createdAt: string
  updatedAt: string
}

export interface DashboardStats {
  total: number
  active: number
  completed: number
  cancelled: number
  avgResolution: number
  onTimeRate: number
  statusBreakdown: Record<string, number>
  moduleBreakdown: Record<string, number>
}

export interface DashboardResponse {
  requests: DashboardRequest[]
  stats: DashboardStats
  pendingApprovals: number
  overdueItems: number
}

export async function fetchDashboardData(): Promise<DashboardResponse> {
  const response = await fetch('/api/dashboard')
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Please sign in to view dashboard data.')
    }
    if (response.status === 403) {
      throw new Error('Your account does not have access to the dashboard.')
    }
    throw new Error('Failed to fetch dashboard data.')
  }
  return response.json()
}
