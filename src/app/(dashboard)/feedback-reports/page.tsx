"use client"

import React, { useState, useMemo, useEffect } from "react"
import { Search, Star, BarChart3, TrendingUp, MessageSquare, ArrowUp, ArrowDown, CheckCircle2, Clock, AlertCircle, Percent } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { getRequests, initializeMockData } from "@/services/engineService"
import type { FeedbackSurvey } from "@/services/feedbackService"
import { cn, fmtDate, fmtDateTime } from "@/lib/utils"
import { useNewRequestsAndTasks } from "@/hooks/useNewRequestsAndTasks"
import { NewItemsAlert } from "@/components/ui/NewItemsAlert"

interface Feedback {
  requestId: string
  requestTitle: string
  requesterName: string
  module: string
  rating: number
  comment: string
  submittedAt: string
}

// Mock feedback data fallback
const MOCK_FEEDBACK: Feedback[] = [
  {
    requestId: "SHP-001",
    requestTitle: "International Shipment to Dubai",
    requesterName: "Ahmed Hassan",
    module: "shipping",
    rating: 5,
    comment: "Excellent service, very fast response and delivery was on time.",
    submittedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    requestId: "PRC-001",
    requestTitle: "Laptop Purchase Order",
    requesterName: "Sarah Smith",
    module: "purchase",
    rating: 4,
    comment: "Good approval process, but took longer than expected.",
    submittedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    requestId: "HR-001",
    requestTitle: "New Hire Onboarding",
    requesterName: "Maria Garcia",
    module: "hr",
    rating: 5,
    comment: "Smooth onboarding experience, all documents processed quickly.",
    submittedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    requestId: "MNT-001",
    requestTitle: "Office AC Maintenance",
    requesterName: "John Wilson",
    module: "maintenance",
    rating: 3,
    comment: "Service was okay but took longer than expected.",
    submittedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    requestId: "EVT-001",
    requestTitle: "Annual Conference Setup",
    requesterName: "Lisa Anderson",
    module: "event",
    rating: 5,
    comment: "Perfect coordination and execution. Great support throughout.",
    submittedAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    requestId: "TRV-001",
    requestTitle: "Business Trip to Singapore",
    requesterName: "Robert Brown",
    module: "travel",
    rating: 4,
    comment: "Good booking assistance, minor delays in approval.",
    submittedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
  },
]

const MODULE_FALLBACK = { bg: "bg-gray-50", text: "text-gray-700", border: "border-gray-200" }
const MODULE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  shipping: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  maintenance: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
  purchase: { bg: "bg-green-50", text: "text-green-700", border: "border-green-200" },
  event: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
  travel: { bg: "bg-pink-50", text: "text-pink-700", border: "border-pink-200" },
  hr: { bg: "bg-teal-50", text: "text-teal-700", border: "border-teal-200" },
  general: { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200" },
}
function getModuleColors(module: string) {
  return MODULE_COLORS[module] ?? MODULE_FALLBACK
}

export default function FeedbackReportsPage() {
  const [search, setSearch] = useState("")
  const [filterRating, setFilterRating] = useState<number | null>(null)
  const [dateRange, setDateRange] = useState<"7d" | "30d" | "90d" | "all">("all")
  const [allFeedback, setAllFeedback] = useState<Feedback[]>([])
  const [allRequests, setAllRequests] = useState<any[]>([])
  const { newRequestsCount, newTasksCount } = useNewRequestsAndTasks()

  useEffect(() => {
    let cancelled = false
    // Load feedback responses
    fetch("/api/feedback/responses")
      .then((res) => res.ok ? res.json() : { responses: [] })
      .then((data) => {
        if (cancelled) return
        const responses: FeedbackSurvey[] = data.responses ?? []
        const feedback: Feedback[] = responses
          .filter((r) => r.rating && r.rating > 0)
          .map((r) => ({
            requestId: r.requestId,
            requestTitle: r.requestTitle,
            requesterName: r.requesterName,
            module: r.module,
            rating: r.rating || 0,
            comment: r.comment || "",
            submittedAt: r.completedAt || r.createdAt,
          }))
        setAllFeedback(feedback)
      })
      .catch(() => {
        if (!cancelled) setAllFeedback([])
      })

    // Load all requests for overall analytics
    fetch("/api/requests")
      .then((res) => res.ok ? res.json() : { data: [] })
      .then((data) => {
        if (cancelled) return
        setAllRequests(data.data ?? [])
      })
      .catch(() => {
        if (!cancelled) setAllRequests(getRequests())
      })

    return () => { cancelled = true }
  }, [])


  // Filter feedback
  const filtered = useMemo(() => {
    const now = new Date()
    const getDateThreshold = () => {
      if (dateRange === "7d") return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      if (dateRange === "30d") return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      if (dateRange === "90d") return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
      return new Date(0)
    }
    const threshold = getDateThreshold()

    return allFeedback.filter((f) => {
      const feedbackDate = new Date(f.submittedAt)
      const matchSearch = f.requestTitle.toLowerCase().includes(search.toLowerCase()) ||
        f.requesterName.toLowerCase().includes(search.toLowerCase()) ||
        f.requestId.toLowerCase().includes(search.toLowerCase())
      const matchRating = filterRating === null || f.rating === filterRating
      const matchDate = feedbackDate >= threshold
      return matchSearch && matchRating && matchDate
    })
  }, [allFeedback, search, filterRating, dateRange])

  // Calculate comprehensive statistics
  const stats = useMemo(() => {
    const moduleStats: Record<string, { count: number; avgRating: number; totalRating: number; requestCount: number; feedbackRate: number; avgResolutionDays: number }> = {}

    // Initialize module stats from all requests
    const modules = new Set<string>()
    allRequests.forEach((r) => modules.add(r.module))
    modules.forEach((m) => {
      moduleStats[m] = { count: 0, avgRating: 0, totalRating: 0, requestCount: 0, feedbackRate: 0, avgResolutionDays: 0 }
    })

    // Count completed/delivered requests per module
    allRequests.forEach((r) => {
      const isCompleted = r.status === "completed" || r.status === "delivered"
      if (isCompleted) {
        moduleStats[r.module].requestCount++
        // Calculate resolution days
        const createdDate = new Date(r.createdAt).getTime()
        const completedDate = new Date(r.updatedAt).getTime()
        const resolutionDays = Math.ceil((completedDate - createdDate) / (1000 * 60 * 60 * 24))
        moduleStats[r.module].avgResolutionDays += resolutionDays
      }
    })

    // Process feedback
    allFeedback.forEach((f) => {
      if (!moduleStats[f.module]) {
        moduleStats[f.module] = { count: 0, avgRating: 0, totalRating: 0, requestCount: 0, feedbackRate: 0, avgResolutionDays: 0 }
      }
      moduleStats[f.module].count++
      moduleStats[f.module].totalRating += f.rating
    })

    // Calculate final stats
    Object.keys(moduleStats).forEach((module) => {
      const data = moduleStats[module]
      data.avgRating = data.count > 0 ? Math.round((data.totalRating / data.count) * 10) / 10 : 0
      data.feedbackRate = data.requestCount > 0 ? Math.round((data.count / data.requestCount) * 100) : 0
      data.avgResolutionDays = data.requestCount > 0 ? Math.ceil(data.avgResolutionDays / data.requestCount) : 0
    })

    const totalRating = allFeedback.reduce((sum, f) => sum + f.rating, 0)
    const avgRating = allFeedback.length > 0 ? Math.round((totalRating / allFeedback.length) * 10) / 10 : 0
    const satisfied = allFeedback.filter((f) => f.rating >= 4).length
    const satisfactionRate = allFeedback.length > 0 ? Math.round((satisfied / allFeedback.length) * 100) : 0

    // Overall metrics
    const totalCompletedRequests = allRequests.filter((r) => r.status === "completed" || r.status === "delivered").length
    const overallFeedbackRate = totalCompletedRequests > 0 ? Math.round((allFeedback.length / totalCompletedRequests) * 100) : 0
    const avgCompletionDays = totalCompletedRequests > 0
      ? Math.ceil(allRequests
          .filter((r) => r.status === "completed" || r.status === "delivered")
          .reduce((sum, r) => {
            const createdDate = new Date(r.createdAt).getTime()
            const completedDate = new Date(r.updatedAt).getTime()
            return sum + Math.ceil((completedDate - createdDate) / (1000 * 60 * 60 * 24))
          }, 0) / totalCompletedRequests)
      : 0

    return {
      totalFeedback: allFeedback.length,
      avgRating,
      satisfactionRate,
      moduleStats,
      overallFeedbackRate,
      totalCompletedRequests,
      avgCompletionDays,
    }
  }, [allFeedback, allRequests])

  const renderStars = (rating: number, size: "sm" | "md" = "sm") => {
    const sizeClass = size === "md" ? "h-5 w-5" : "h-4 w-4"
    return (
      <div className="flex gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={cn(
              sizeClass,
              i < rating ? "fill-amber-400 text-amber-400" : "text-gray-200"
            )}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900">Feedback & Reports</h1>
            <p className="text-gray-600 mt-2">Employee satisfaction metrics and service quality analytics across all departments</p>
          </div>
          <div className="flex items-center gap-3 ml-4">
            {(newRequestsCount > 0 || newTasksCount > 0) && (
              <NewItemsAlert requestsCount={newRequestsCount} tasksCount={newTasksCount} variant="icon" />
            )}
          </div>
        </div>
      </div>

      {/* Summary Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <Card className="border-0 bg-gradient-to-br from-slate-50 to-slate-100 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-gray-700">Total Feedback</CardTitle>
              <div className="bg-white rounded-lg p-2">
                <MessageSquare className="h-4 w-4 text-gray-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{stats.totalFeedback || "—"}</div>
            <p className="text-xs text-gray-600 mt-2">responses collected</p>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-amber-50 to-amber-100 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-gray-700">Average Rating</CardTitle>
              <div className="bg-white rounded-lg p-2">
                <Star className="h-4 w-4 text-amber-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{stats.avgRating || "—"}</div>
            <div className="mt-3">{stats.avgRating ? renderStars(Math.round(stats.avgRating), "sm") : null}</div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-emerald-50 to-emerald-100 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-gray-700">Satisfaction Rate</CardTitle>
              <div className="bg-white rounded-lg p-2">
                <TrendingUp className="h-4 w-4 text-emerald-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-700">{stats.satisfactionRate ? `${stats.satisfactionRate}%` : "—"}</div>
            <p className="text-xs text-gray-600 mt-2">4-5 star ratings</p>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-blue-50 to-blue-100 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-gray-700">Feedback Rate</CardTitle>
              <div className="bg-white rounded-lg p-2">
                <Percent className="h-4 w-4 text-blue-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-700">
              {stats.overallFeedbackRate || "—"}%
            </div>
            <p className="text-xs text-gray-600 mt-2">of completed requests</p>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-rose-50 to-rose-100 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-gray-700">Avg Resolution</CardTitle>
              <div className="bg-white rounded-lg p-2">
                <Clock className="h-4 w-4 text-rose-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-rose-700">
              {stats.avgCompletionDays || "—"}
            </div>
            <p className="text-xs text-gray-600 mt-2">days to complete</p>
          </CardContent>
        </Card>
      </div>

      {/* Module Performance Report */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="border-b bg-gray-50 rounded-t-lg">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 rounded-lg p-2">
              <BarChart3 className="h-5 w-5 text-blue-700" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold text-gray-900">Module Performance Report</CardTitle>
              <p className="text-xs text-gray-600 mt-1">Average satisfaction ratings by department</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-5">
            {Object.entries(stats.moduleStats).map(([module, data]) => (
              <div key={module} className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Badge className={cn("font-semibold border-0", getModuleColors(module).bg, getModuleColors(module).text)}>
                      {module.charAt(0).toUpperCase() + module.slice(1)}
                    </Badge>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{data.count} feedback{data.count !== 1 ? 's' : ''} • {data.requestCount} total</p>
                      <p className="text-xs text-gray-500">from {data.requestCount} completed request{data.requestCount !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold text-gray-900">{data.avgRating}</span>
                      <span className="text-sm text-gray-600">/5.0</span>
                    </div>
                    <div className="mt-1">{renderStars(Math.round(data.avgRating), "sm")}</div>
                  </div>
                </div>

                {/* Rating Progress Bar */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-gray-600">Satisfaction Score</span>
                    <span className="text-xs font-bold text-gray-700">{data.feedbackRate}% rated</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className={cn(
                        "h-2.5 rounded-full transition-all",
                        data.avgRating >= 4.5 ? "bg-emerald-500" : data.avgRating >= 4 ? "bg-blue-500" : data.avgRating >= 3.5 ? "bg-amber-500" : "bg-orange-500"
                      )}
                      style={{ width: `${(data.avgRating / 5) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div className="bg-gray-50 rounded p-2 text-center">
                    <p className="text-gray-500 font-semibold">Feedback Rate</p>
                    <p className="text-lg font-bold text-gray-900 mt-1">{data.feedbackRate}%</p>
                  </div>
                  <div className="bg-gray-50 rounded p-2 text-center">
                    <p className="text-gray-500 font-semibold">Avg Days</p>
                    <p className="text-lg font-bold text-gray-900 mt-1">{data.avgResolutionDays}d</p>
                  </div>
                  <div className="bg-gray-50 rounded p-2 text-center">
                    <p className="text-gray-500 font-semibold">Rating Count</p>
                    <p className="text-lg font-bold text-gray-900 mt-1">{data.count}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Request Resolution Analytics */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="border-b bg-gray-50 rounded-t-lg">
          <div className="flex items-center gap-3">
            <div className="bg-green-100 rounded-lg p-2">
              <CheckCircle2 className="h-5 w-5 text-green-700" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold text-gray-900">Request Resolution & Feedback Analytics</CardTitle>
              <p className="text-xs text-gray-600 mt-1">Overall system performance metrics for completed requests</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Feedback Coverage Chart */}
            <div className="border border-gray-200 rounded-lg p-5">
              <h3 className="font-semibold text-gray-900 mb-4 text-sm">Feedback Response Coverage</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-700">Total Completed Requests</span>
                    <span className="text-lg font-bold text-gray-900">{stats.totalCompletedRequests}</span>
                  </div>
                  <div className="bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-blue-500 h-3 rounded-full"
                      style={{ width: "100%" }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-700">Received Feedback</span>
                    <span className="text-lg font-bold text-emerald-600">{stats.totalFeedback}</span>
                  </div>
                  <div className="bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-emerald-500 h-3 rounded-full"
                      style={{ width: `${stats.overallFeedbackRate}%` }}
                    />
                  </div>
                </div>
                <div className="pt-3 border-t">
                  <p className="text-sm text-gray-600">
                    <span className="font-semibold text-gray-900">{stats.overallFeedbackRate}%</span> of completed requests have feedback
                  </p>
                </div>
              </div>
            </div>

            {/* Resolution Metrics */}
            <div className="border border-gray-200 rounded-lg p-5">
              <h3 className="font-semibold text-gray-900 mb-4 text-sm">System Performance Metrics</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div>
                    <p className="text-xs text-blue-600 font-semibold">Average Resolution Time</p>
                    <p className="text-lg font-bold text-blue-900 mt-1">{stats.avgCompletionDays} days</p>
                  </div>
                  <Clock className="h-8 w-8 text-blue-400" />
                </div>
                <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <div>
                    <p className="text-xs text-amber-600 font-semibold">Overall Satisfaction</p>
                    <p className="text-lg font-bold text-amber-900 mt-1">{stats.avgRating}/5.0</p>
                  </div>
                  <Star className="h-8 w-8 text-amber-400 fill-amber-400" />
                </div>
                <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                  <div>
                    <p className="text-xs text-emerald-600 font-semibold">Positive Reviews (4-5★)</p>
                    <p className="text-lg font-bold text-emerald-900 mt-1">{stats.satisfactionRate}%</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-emerald-400" />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Customer Feedback List */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="border-b bg-gray-50 rounded-t-lg">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-purple-100 rounded-lg p-2">
              <MessageSquare className="h-5 w-5 text-purple-700" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold text-gray-900">Employee Feedback</CardTitle>
              <p className="text-xs text-gray-600 mt-1">Detailed satisfaction responses and improvement suggestions from employees</p>
            </div>
          </div>

          <div className="mt-4 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by request ID, title, or requester name..."
                className="pl-10 bg-white border-gray-300 text-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-2">Date Range:</p>
                <div className="flex gap-2">
                  {[
                    { value: "7d" as const, label: "Last 7 Days" },
                    { value: "30d" as const, label: "Last 30 Days" },
                    { value: "90d" as const, label: "Last 90 Days" },
                    { value: "all" as const, label: "All Time" },
                  ].map((option) => (
                    <Button
                      key={option.value}
                      variant={dateRange === option.value ? "default" : "outline"}
                      size="sm"
                      onClick={() => setDateRange(option.value)}
                      className="text-xs h-8"
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-600 mb-2">Filter by Rating:</p>
                <div className="flex gap-2">
                  {[5, 4, 3, 2, 1].map((rating) => (
                    <Button
                      key={rating}
                      variant={filterRating === rating ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFilterRating(filterRating === rating ? null : rating)}
                      className="text-xs h-8"
                    >
                      {rating}★
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          {filtered.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No feedback responses found</p>
              <p className="text-gray-400 text-sm mt-1">Try adjusting your search criteria or date range</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filtered.map((feedback) => (
                <div key={`${feedback.requestId}-${feedback.submittedAt}`} className={cn(
                  "border rounded-lg p-5 transition-all hover:border-gray-400 hover:shadow-md",
                  getModuleColors(feedback.module).border,
                  "bg-white"
                )}>
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-semibold text-gray-900 text-sm">{feedback.requestId}</span>
                        <Badge className={cn("text-xs border-0", getModuleColors(feedback.module).bg, getModuleColors(feedback.module).text)}>
                          {feedback.module.charAt(0).toUpperCase() + feedback.module.slice(1)}
                        </Badge>
                      </div>
                      <p className="text-sm font-medium text-gray-900">{feedback.requestTitle}</p>
                    </div>
                    <div className="flex-shrink-0">
                      {renderStars(feedback.rating, "md")}
                    </div>
                  </div>

                  {feedback.comment && (
                    <p className="text-sm text-gray-700 bg-gray-50 rounded p-3 mb-3 border-l-2 border-gray-300 italic">
                      "{feedback.comment}"
                    </p>
                  )}

                  {/* Request Evaluation Metrics */}
                  <div className="mt-4 pt-4 border-t grid grid-cols-3 gap-2">
                    <div className="text-center">
                      <p className="text-xs text-gray-500 font-semibold">User Satisfaction</p>
                      <div className="mt-1 flex justify-center">
                        {feedback.rating >= 4 ? (
                          <div className="flex items-center gap-1">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                            <span className="text-xs font-bold text-emerald-600">Positive</span>
                          </div>
                        ) : feedback.rating >= 3 ? (
                          <div className="flex items-center gap-1">
                            <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                            <span className="text-xs font-bold text-amber-600">Neutral</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <AlertCircle className="h-3.5 w-3.5 text-red-600" />
                            <span className="text-xs font-bold text-red-600">Negative</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-500 font-semibold">Status</p>
                      <Badge className="mt-2 bg-emerald-100 text-emerald-700 border-0">Resolved</Badge>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-500 font-semibold">Rating Score</p>
                      <p className="text-sm font-bold text-gray-900 mt-1">{feedback.rating}/5</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-500 mt-4">
                    <span>Submitted by <span className="font-medium text-gray-700">{feedback.requesterName}</span></span>
                    <span>{fmtDate(feedback.submittedAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
