"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, CheckCircle2, Star, Send, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface SystemNotice {
  id: string
  title: string
  type: "feature" | "bug_fix" | "update"
  summary: string
  description?: string
  postedAt: string
}

interface UserFeedback {
  id: string
  userId: string
  userEmail: string
  userName: string
  category: "general" | "bug" | "feature_request" | "ui_ux"
  title: string
  comment: string
  status: "new" | "reviewed" | "resolved"
  createdAt: string
  rating?: number
}

type FeedbackCategory = "general" | "bug" | "feature_request" | "ui_ux"

export default function SystemNoticesPage() {
  const { data: session } = useSession()
  const [notices, setNotices] = useState<SystemNotice[]>([])
  const [userFeedback, setUserFeedback] = useState<UserFeedback[]>([])
  const [expandedNotice, setExpandedNotice] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"notices" | "feedback">("notices")
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")

  const [feedbackForm, setFeedbackForm] = useState({
    category: "general" as FeedbackCategory,
    title: "",
    comment: "",
    rating: 5,
  })

  useEffect(() => {
    loadNotices()
    loadFeedback()
  }, [])

  const loadNotices = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/notices")
      if (res.ok) {
        const data = await res.json()
        setNotices(data.notices || [])
      }
    } catch (error) {
      console.error("Failed to load notices:", error)
    }
    setLoading(false)
  }

  const loadFeedback = async () => {
    try {
      const res = await fetch("/api/feedback/user-feedback?mode=own")
      if (res.ok) {
        const data = await res.json()
        setUserFeedback(data.feedback || [])
      }
    } catch (error) {
      console.error("Failed to load feedback:", error)
    }
  }

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!feedbackForm.title.trim() || !feedbackForm.comment.trim()) {
      alert("Please fill in title and comment")
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch("/api/feedback/user-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(feedbackForm),
      })

      if (res.ok) {
        setSuccessMessage("Thank you! Your feedback has been submitted.")
        setFeedbackForm({ category: "general", title: "", comment: "", rating: 5 })
        setTimeout(() => setSuccessMessage(""), 3000)
        loadFeedback()
      } else {
        alert("Failed to submit feedback")
      }
    } catch (error) {
      console.error("Failed to submit feedback:", error)
      alert("Error submitting feedback")
    }
    setSubmitting(false)
  }

  const getCategoryColor = (category: FeedbackCategory) => {
    switch (category) {
      case "bug":
        return "bg-red-100 text-red-700 border-red-200"
      case "feature_request":
        return "bg-blue-100 text-blue-700 border-blue-200"
      case "ui_ux":
        return "bg-purple-100 text-purple-700 border-purple-200"
      default:
        return "bg-gray-100 text-gray-700 border-gray-200"
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case "feature":
        return "bg-green-100 text-green-700"
      case "bug_fix":
        return "bg-blue-100 text-blue-700"
      default:
        return "bg-gray-100 text-gray-700"
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" })
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">System Notices & Feedback</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Latest updates, features, and bug fixes. Share your feedback to help us improve.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab("notices")}
          className={cn(
            "px-4 py-2 font-medium transition-colors",
            activeTab === "notices"
              ? "border-b-2 border-teal-500 text-teal-600 dark:text-teal-400"
              : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300"
          )}
        >
          System Updates ({notices.length})
        </button>
        <button
          onClick={() => setActiveTab("feedback")}
          className={cn(
            "px-4 py-2 font-medium transition-colors",
            activeTab === "feedback"
              ? "border-b-2 border-teal-500 text-teal-600 dark:text-teal-400"
              : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300"
          )}
        >
          Your Feedback ({userFeedback.length})
        </button>
      </div>

      {/* Notices Tab */}
      {activeTab === "notices" && (
        <div className="space-y-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
            </div>
          ) : notices.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-gray-600 dark:text-gray-400">
                No system updates available yet.
              </CardContent>
            </Card>
          ) : (
            notices.map((notice) => (
              <Card key={notice.id} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div onClick={() => setExpandedNotice(expandedNotice === notice.id ? null : notice.id)}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{notice.title}</h3>
                          <Badge className={cn("text-xs", getTypeColor(notice.type))}>
                            {notice.type === "feature"
                              ? "Feature"
                              : notice.type === "bug_fix"
                                ? "Bug Fix"
                                : "Update"}
                          </Badge>
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">{notice.summary}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">{formatDate(notice.postedAt)}</p>
                      </div>
                    </div>

                    {expandedNotice === notice.id && notice.description && (
                      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">{notice.description}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Feedback Tab */}
      {activeTab === "feedback" && (
        <div className="space-y-6">
          {/* Submit Feedback Form */}
          <Card className="border-teal-200 dark:border-teal-900">
            <CardHeader className="bg-teal-50 dark:bg-teal-950">
              <CardTitle className="text-teal-900 dark:text-teal-100">Share Your Feedback</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {successMessage && (
                <div className="mb-4 p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-2 text-green-700 dark:text-green-300">
                  <CheckCircle2 className="h-4 w-4" />
                  {successMessage}
                </div>
              )}

              <form onSubmit={handleSubmitFeedback} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Feedback Category
                    </label>
                    <select
                      value={feedbackForm.category}
                      onChange={(e) =>
                        setFeedbackForm({ ...feedbackForm, category: e.target.value as FeedbackCategory })
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                    >
                      <option value="general">General Feedback</option>
                      <option value="bug">Bug Report</option>
                      <option value="feature_request">Feature Request</option>
                      <option value="ui_ux">UI/UX Improvement</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Rating
                    </label>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setFeedbackForm({ ...feedbackForm, rating: star })}
                          className="transition-colors"
                        >
                          <Star
                            className="h-6 w-6"
                            fill={star <= feedbackForm.rating ? "currentColor" : "none"}
                            color={star <= feedbackForm.rating ? "#fbbf24" : "#d1d5db"}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Title *
                  </label>
                  <Input
                    value={feedbackForm.title}
                    onChange={(e) => setFeedbackForm({ ...feedbackForm, title: e.target.value })}
                    placeholder="e.g., Travel module is great!"
                    maxLength={100}
                    className="dark:bg-gray-700 dark:text-white"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {feedbackForm.title.length}/100
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Comment *
                  </label>
                  <Textarea
                    value={feedbackForm.comment}
                    onChange={(e) => setFeedbackForm({ ...feedbackForm, comment: e.target.value })}
                    placeholder="Tell us what you think..."
                    rows={5}
                    maxLength={1000}
                    className="dark:bg-gray-700 dark:text-white"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {feedbackForm.comment.length}/1000
                  </p>
                </div>

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-teal-600 hover:bg-teal-700 text-white"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Submit Feedback
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Your Feedback List */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Your Feedback History</h3>
            {userFeedback.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center text-gray-600 dark:text-gray-400">
                  No feedback submitted yet.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {userFeedback.map((feedback) => (
                  <Card key={feedback.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-gray-900 dark:text-white">{feedback.title}</h4>
                            <Badge className={cn("text-xs border", getCategoryColor(feedback.category))}>
                              {feedback.category === "bug"
                                ? "Bug"
                                : feedback.category === "feature_request"
                                  ? "Feature Request"
                                  : feedback.category === "ui_ux"
                                    ? "UI/UX"
                                    : "General"}
                            </Badge>
                            <Badge className="text-xs">
                              {feedback.status === "new"
                                ? "New"
                                : feedback.status === "reviewed"
                                  ? "Reviewed"
                                  : "Resolved"}
                            </Badge>
                          </div>
                          <p className="text-gray-600 dark:text-gray-400 text-sm mt-2">{feedback.comment}</p>
                          <div className="flex items-center gap-4 mt-2">
                            <p className="text-xs text-gray-500 dark:text-gray-500">{formatDate(feedback.createdAt)}</p>
                            {feedback.rating && (
                              <div className="flex gap-0.5">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star
                                    key={star}
                                    className="h-3 w-3"
                                    fill={star <= (feedback.rating || 0) ? "currentColor" : "none"}
                                    color={star <= (feedback.rating || 0) ? "#fbbf24" : "#d1d5db"}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
