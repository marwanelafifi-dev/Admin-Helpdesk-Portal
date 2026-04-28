"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { FileText, Clock, CheckCircle2, TrendingUp, Package } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { mockStats, mockRequestsByModule, mockRecentActivity } from "@/lib/mock-data"

const statusColors: Record<string, string> = {
  Approved: "bg-green-100 text-green-700",
  Pending: "bg-yellow-100 text-yellow-700",
  "In Progress": "bg-blue-100 text-blue-700",
  Rejected: "bg-red-100 text-red-700",
}

interface StatCardProps {
  title: string
  value: number
  icon: React.ElementType
  iconColor: string
  iconBg: string
  change?: string
}

function StatCard({ title, value, icon: Icon, iconColor, iconBg, change }: StatCardProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold mt-1">{value}</p>
            {change && <p className="text-xs text-muted-foreground mt-1">{change}</p>}
          </div>
          <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${iconBg}`}>
            <Icon className={`h-5 w-5 ${iconColor}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Overview of all requests and activities
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Total Requests"
          value={mockStats.totalRequests}
          icon={FileText}
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
          change="All time"
        />
        <StatCard
          title="Pending Review"
          value={mockStats.pendingRequests}
          icon={Clock}
          iconColor="text-amber-600"
          iconBg="bg-amber-50"
          change="Awaiting approval"
        />
        <StatCard
          title="Approved"
          value={mockStats.approvedRequests}
          icon={CheckCircle2}
          iconColor="text-green-600"
          iconBg="bg-green-50"
          change="Successfully processed"
        />
        <StatCard
          title="In Progress"
          value={mockStats.inProgress}
          icon={TrendingUp}
          iconColor="text-violet-600"
          iconBg="bg-violet-50"
          change="Currently active"
        />
      </div>

      {/* Shipment mini stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Total Shipments"
          value={mockStats.totalShipments}
          icon={Package}
          iconColor="text-sky-600"
          iconBg="bg-sky-50"
        />
        <StatCard
          title="In Transit"
          value={mockStats.inTransit}
          icon={Package}
          iconColor="text-indigo-600"
          iconBg="bg-indigo-50"
        />
        <StatCard
          title="Delivered"
          value={mockStats.delivered}
          icon={CheckCircle2}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50"
        />
      </div>

      {/* Chart + Activity */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Bar chart */}
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Requests by Module</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={mockRequestsByModule} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="module"
                  tick={{ fontSize: 12, fill: "#64748b" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: "#64748b" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: "8px",
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  }}
                />
                <Bar dataKey="count" fill="#3b82f6" radius={[6, 6, 0, 0]} maxBarSize={56} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Recent activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {mockRecentActivity.map((activity) => (
              <div key={activity.id} className="flex items-start gap-3">
                <div className="h-2 w-2 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{activity.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{activity.time}</p>
                </div>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${
                    statusColors[activity.status] ?? "bg-gray-100 text-gray-700"
                  }`}
                >
                  {activity.status}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
