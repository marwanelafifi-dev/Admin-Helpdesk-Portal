"use client"

import React, { useState, useMemo, useEffect } from "react"
import { Search, Star, BarChart3, TrendingUp, MessageSquare } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { getRequests, initializeMockData } from "@/services/engineService"
import { getFeedbackResponses, type FeedbackSurvey } from "@/services/feedbackService"
import { cn } from "@/lib/utils"

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

const MODULE_COLORS: Record<string, { bg: string; text: string }> = {
  shipping: { bg: "bg-blue-50", text: "text-blue-700" },
  maintenance: { bg: "bg-purple-50", text: "text-purple-700" },
  purchase: { bg: "bg-green-50", text: "text-green-700" },
  event: { bg: "bg-orange-50", text: "text-orange-700" },
  travel: { bg: "bg-pink-50", text: "text-pink-700" },
  hr: { bg: "bg-teal-50", text: "text-teal-700" },
}

export default function FeedbackReportsPage() {
  const [search, setSearch] = useState("")
  const [filterRating, setFilterRating] = useState<number | null>(null)
  const [allFeedback, setAllFeedback] = useState<Feedback[]>(MOCK_FEEDBACK)

  useEffect(() => {
    const responses = getFeedbackResponses()
    if (responses.length > 0) {
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
      if (feedback.length > 0) {
        setAllFeedback(feedback)
      }
    }
  }, [])

  // Filter feedback
  const filtered = useMemo(() => {
    return allFeedback.filter((f) => {
      const matchSearch = f.requestTitle.toLowerCase().includes(search.toLowerCase()) ||
        f.requesterName.toLowerCase().includes(search.toLowerCase()) ||
        f.requestId.toLowerCase().includes(search.toLowerCase())
      const matchRating = filterRating === null || f.rating === filterRating
      return matchSearch && matchRating
    })
  }, [search, filterRating])

  // Calculate statistics
  const stats = useMemo(() => {
    const moduleStats: Record<string, { count: number; avgRating: number; totalRating: number }> = {}

    allFeedback.forEach((f) => {
      if (!moduleStats[f.module]) {
        moduleStats[f.module] = { count: 0, avgRating: 0, totalRating: 0 }
      }
      moduleStats[f.module].count++
      moduleStats[f.module].totalRating += f.rating
    })

    Object.keys(moduleStats).forEach((module) => {
      moduleStats[module].avgRating = Math.round((moduleStats[module].totalRating / moduleStats[module].count) * 10) / 10
    })

    const totalRating = allFeedback.reduce((sum, f) => sum + f.rating, 0)
    const avgRating = Math.round((totalRating / allFeedback.length) * 10) / 10
    const satisfied = allFeedback.filter((f) => f.rating >= 4).length
    const satisfactionRate = Math.round((satisfied / allFeedback.length) * 100)

    return {
      totalFeedback: allFeedback.length,
      avgRating,
      satisfactionRate,
      moduleStats,
    }
  }, [allFeedback])

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString("en-GB", { day: "short", month: "short", year: "numeric" })
  }

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={cn(
              "h-4 w-4",
              i < rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
            )}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b pb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Feedback & Reports</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Customer satisfaction feedback and performance reports by KPIs
            </p>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Total Feedback</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{stats.totalFeedback}</div>
            <p className="text-xs text-gray-500 mt-1">responses collected</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Average Rating</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{stats.avgRating}</div>
            <div className="mt-2">{renderStars(Math.round(stats.avgRating))}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Satisfaction Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.satisfactionRate}%</div>
            <p className="text-xs text-gray-500 mt-1">4+ stars</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Response Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {allFeedback.length > 0 ? Math.round((allFeedback.length / 20) * 100) : 0}%
            </div>
            <p className="text-xs text-gray-500 mt-1">of recent requests</p>
          </CardContent>
        </Card>
      </div>

      {/* Module Performance Report */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Module Performance Report
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(stats.moduleStats).map(([module, data]) => (
              <div key={module} className="border-b pb-4 last:border-b-0">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge className={cn(MODULE_COLORS[module].bg, MODULE_COLORS[module].text, "border-0")}>
                      {module.charAt(0).toUpperCase() + module.slice(1)}
                    </Badge>
                    <span className="text-sm font-medium text-gray-700">{data.count} feedbacks</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-gray-900">{data.avgRating}</span>
                    {renderStars(Math.round(data.avgRating))}
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={cn(
                      "h-2 rounded-full",
                      data.avgRating >= 4.5 ? "bg-green-500" : data.avgRating >= 3.5 ? "bg-blue-500" : "bg-orange-500"
                    )}
                    style={{ width: `${(data.avgRating / 5) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Feedback List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Customer Feedback
            </CardTitle>
          </div>
          <div className="mt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by request ID, title, or requester..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex gap-2 mt-3">
              {[5, 4, 3, 2, 1].map((rating) => (
                <Button
                  key={rating}
                  variant={filterRating === rating ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterRating(filterRating === rating ? null : rating)}
                  className="text-xs"
                >
                  {rating}★
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filtered.map((feedback) => (
              <div key={`${feedback.requestId}-${feedback.submittedAt}`} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">{feedback.requestId}</span>
                      <Badge className={cn(MODULE_COLORS[feedback.module].bg, MODULE_COLORS[feedback.module].text, "border-0")}>
                        {feedback.module}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-700 mt-1">{feedback.requestTitle}</p>
                  </div>
                  {renderStars(feedback.rating)}
                </div>
                <p className="text-sm text-gray-600 mb-2">{feedback.comment}</p>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>By {feedback.requesterName}</span>
                  <span>{formatDate(feedback.submittedAt)}</span>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No feedback matching your filters
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
