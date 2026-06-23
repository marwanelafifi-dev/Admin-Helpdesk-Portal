"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, CheckCircle2, Star, Send, Loader2, Edit2, Trash2, Plus, FileUp, Download, Eye, Users, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { isSuperAdmin, hasPermission } from "@/lib/access"

interface SystemNotice {
  id: string
  title: string
  type: "feature" | "bug_fix" | "update"
  summary: string
  description?: string
  postedAt: string
}

interface Attachment {
  id: string
  name: string
  type: string
  size: number
  url: string
  uploadedAt: string
}

interface UserFeedback {
  id: string
  userId: string
  userEmail: string
  userName: string
  category: "general" | "bug" | "feature_request" | "ui_ux"
  title: string
  comment: string
  status: "new" | "in_progress" | "completed" | "resolved" | "cancelled"
  createdAt: string
  rating?: number
  attachments?: Attachment[]
}

type FeedbackCategory = "general" | "bug" | "feature_request" | "ui_ux"

export default function SystemNoticesPage() {
  const { data: session } = useSession()
  const [notices, setNotices] = useState<SystemNotice[]>([])
  const [userFeedback, setUserFeedback] = useState<UserFeedback[]>([])
  const [allUsersFeedback, setAllUsersFeedback] = useState<UserFeedback[]>([])
  const [expandedNotice, setExpandedNotice] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"notices" | "feedback" | "all-feedback">("notices")
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")
  const [editingNotice, setEditingNotice] = useState<SystemNotice | null>(null)
  const [showNoticeForm, setShowNoticeForm] = useState(false)
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [updatingFeedbackId, setUpdatingFeedbackId] = useState<string | null>(null)

  const isFullAccess = isSuperAdmin(session?.user?.role) || hasPermission(session?.user?.permissions, "manage_users")
  const canManageFeedback = hasPermission(session?.user?.permissions, "manage_feedback")
  const permissions = session?.user?.permissions || []

  const [noticeForm, setNoticeForm] = useState({
    title: "",
    type: "feature" as "feature" | "bug_fix" | "update",
    summary: "",
    description: "",
  })

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
        setNotices(data.data || data.notices || [])
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

  const loadAllUsersFeedback = async () => {
    try {
      const res = await fetch("/api/feedback/user-feedback?mode=all")
      if (res.ok) {
        const data = await res.json()
        setAllUsersFeedback(data.feedback || [])
      }
    } catch (error) {
      console.error("Failed to load all users feedback:", error)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files
    if (!files) return

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const reader = new FileReader()

      reader.onload = () => {
        const attachment: Attachment = {
          id: `att-${Date.now()}-${i}`,
          name: file.name,
          type: file.type,
          size: file.size,
          url: reader.result as string,
          uploadedAt: new Date().toISOString(),
        }
        setAttachments([...attachments, attachment])
      }

      reader.readAsDataURL(file)
    }

    e.currentTarget.value = ""
  }

  const removeAttachment = (id: string) => {
    setAttachments(attachments.filter((a) => a.id !== id))
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i]
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
        body: JSON.stringify({
          ...feedbackForm,
          attachments,
        }),
      })

      if (res.ok) {
        setSuccessMessage("Thank you! Your feedback has been submitted.")
        setFeedbackForm({ category: "general", title: "", comment: "", rating: 5 })
        setAttachments([])
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

  const handleSaveNotice = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!noticeForm.title.trim() || !noticeForm.summary.trim()) {
      alert("Please fill in title and summary")
      return
    }

    setSubmitting(true)
    try {
      const method = editingNotice ? "PUT" : "POST"
      const url = editingNotice ? `/api/admin/notices/${editingNotice.id}` : "/api/admin/notices"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(noticeForm),
      })

      if (res.ok) {
        setSuccessMessage(editingNotice ? "Notice updated successfully" : "Notice created successfully")
        setNoticeForm({ title: "", type: "feature", summary: "", description: "" })
        setEditingNotice(null)
        setShowNoticeForm(false)
        setTimeout(() => setSuccessMessage(""), 3000)
        loadNotices()
      } else {
        alert("Failed to save notice")
      }
    } catch (error) {
      console.error("Failed to save notice:", error)
      alert("Error saving notice")
    }
    setSubmitting(false)
  }

  const handleDeleteNotice = async (id: string) => {
    if (!confirm("Are you sure you want to delete this notice?")) return

    try {
      const res = await fetch(`/api/admin/notices/${id}`, { method: "DELETE" })
      if (res.ok) {
        setSuccessMessage("Notice deleted successfully")
        setTimeout(() => setSuccessMessage(""), 3000)
        loadNotices()
      } else {
        alert("Failed to delete notice")
      }
    } catch (error) {
      console.error("Failed to delete notice:", error)
      alert("Error deleting notice")
    }
  }

  const startEditNotice = (notice: SystemNotice) => {
    setEditingNotice(notice)
    setNoticeForm({
      title: notice.title,
      type: notice.type,
      summary: notice.summary,
      description: notice.description || "",
    })
    setShowNoticeForm(true)
  }

  const updateFeedbackStatus = async (feedbackId: string, newStatus: string) => {
    setUpdatingFeedbackId(feedbackId)
    try {
      const res = await fetch(`/api/feedback/user-feedback/${feedbackId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })

      if (res.ok) {
        const { feedback } = await res.json()
        // Update the feedback in the state
        setAllUsersFeedback(allUsersFeedback.map((f) => (f.id === feedbackId ? feedback : f)))
        setSuccessMessage("Feedback status updated successfully")
        setTimeout(() => setSuccessMessage(""), 3000)
      } else {
        alert("Failed to update feedback status")
      }
    } catch (error) {
      console.error("Failed to update feedback status:", error)
      alert("Error updating feedback status")
    } finally {
      setUpdatingFeedbackId(null)
    }
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
        {canManageFeedback && (
          <button
            onClick={() => {
              setActiveTab("all-feedback")
              loadAllUsersFeedback()
            }}
            className={cn(
              "px-4 py-2 font-medium transition-colors flex items-center gap-1",
              activeTab === "all-feedback"
                ? "border-b-2 border-teal-500 text-teal-600 dark:text-teal-400"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300"
            )}
          >
            <Users className="h-4 w-4" />
            All Users Feedback ({allUsersFeedback.length})
          </button>
        )}
      </div>

      {/* Notices Tab */}
      {activeTab === "notices" && (
        <div className="space-y-4">
          {/* Admin: New Notice Form */}
          {isFullAccess && (
            <>
              <div className="flex justify-end">
                {showNoticeForm ? (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowNoticeForm(false)
                      setEditingNotice(null)
                      setNoticeForm({ title: "", type: "feature", summary: "", description: "" })
                    }}
                  >
                    Cancel
                  </Button>
                ) : (
                  <Button
                    className="bg-teal-600 hover:bg-teal-700"
                    onClick={() => {
                      setShowNoticeForm(true)
                      setEditingNotice(null)
                      setNoticeForm({ title: "", type: "feature", summary: "", description: "" })
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    New Notice
                  </Button>
                )}
              </div>

              {successMessage && (
                <div className="p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-2 text-green-700 dark:text-green-300">
                  <CheckCircle2 className="h-4 w-4" />
                  {successMessage}
                </div>
              )}

              {showNoticeForm && (
                <Card className="border-teal-200 dark:border-teal-900">
                  <CardHeader className="bg-teal-50 dark:bg-teal-950">
                    <CardTitle className="text-teal-900 dark:text-teal-100">
                      {editingNotice ? "Edit Notice" : "Create New Notice"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <form onSubmit={handleSaveNotice} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Type
                        </label>
                        <select
                          value={noticeForm.type}
                          onChange={(e) => setNoticeForm({ ...noticeForm, type: e.target.value as any })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                        >
                          <option value="feature">Feature</option>
                          <option value="bug_fix">Bug Fix</option>
                          <option value="update">Update</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Title *
                        </label>
                        <Input
                          value={noticeForm.title}
                          onChange={(e) => setNoticeForm({ ...noticeForm, title: e.target.value })}
                          placeholder="e.g., Travel module is now live"
                          className="dark:bg-gray-700 dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Summary *
                        </label>
                        <Input
                          value={noticeForm.summary}
                          onChange={(e) => setNoticeForm({ ...noticeForm, summary: e.target.value })}
                          placeholder="Brief one-line summary"
                          className="dark:bg-gray-700 dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Description (Optional)
                        </label>
                        <Textarea
                          value={noticeForm.description}
                          onChange={(e) => setNoticeForm({ ...noticeForm, description: e.target.value })}
                          placeholder="Detailed description..."
                          rows={4}
                          className="dark:bg-gray-700 dark:text-white"
                        />
                      </div>

                      <div className="flex gap-2 justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setShowNoticeForm(false)
                            setEditingNotice(null)
                            setNoticeForm({ title: "", type: "feature", summary: "", description: "" })
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          disabled={submitting}
                          className="bg-teal-600 hover:bg-teal-700 text-white"
                        >
                          {submitting ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                              {editingNotice ? "Update Notice" : "Create Notice"}
                            </>
                          )}
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* Notices List */}
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
              <Card key={notice.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div
                    onClick={() => setExpandedNotice(expandedNotice === notice.id ? null : notice.id)}
                    className="cursor-pointer"
                  >
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
                      {isFullAccess && (
                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => startEditNotice(notice)}
                            className="text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteNotice(notice.id)}
                            className="text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Attachments (Photos, Videos, Files)
                  </label>
                  <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 text-center hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <input
                      type="file"
                      multiple
                      accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="feedback-file-input"
                    />
                    <label htmlFor="feedback-file-input" className="cursor-pointer flex flex-col items-center gap-2">
                      <FileUp className="h-5 w-5 text-gray-400" />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Click to upload or drag and drop
                      </span>
                      <span className="text-xs text-gray-500">PNG, JPG, MP4, PDF up to 10MB each</span>
                    </label>
                  </div>

                  {attachments.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
                        Attached: {attachments.length} file{attachments.length !== 1 ? "s" : ""}
                      </p>
                      {attachments.map((att) => (
                        <div key={att.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-md">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">{att.name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-500">{formatFileSize(att.size)}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeAttachment(att.id)}
                            className="ml-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
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
                                : feedback.status === "in_progress"
                                  ? "In Progress"
                                  : feedback.status === "completed"
                                    ? "Completed"
                                    : feedback.status === "resolved"
                                      ? "Resolved"
                                      : "Cancelled"}
                            </Badge>
                          </div>
                          <p className="text-gray-600 dark:text-gray-400 text-sm mt-2">{feedback.comment}</p>

                          {feedback.attachments && feedback.attachments.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                                Attachments ({feedback.attachments.length})
                              </p>
                              <div className="space-y-1">
                                {feedback.attachments.map((att) => (
                                  <a
                                    key={att.id}
                                    href={`/api/feedback/attachments/${feedback.id}--${att.id}`}
                                    download={att.name}
                                    className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                  >
                                    <Download className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300 flex-1 truncate">
                                      {att.name}
                                    </span>
                                    <span className="text-xs text-gray-500 dark:text-gray-500">({formatFileSize(att.size)})</span>
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}

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

      {/* All Users Feedback Tab (manage_feedback permission required) */}
      {activeTab === "all-feedback" && canManageFeedback && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">All Users Feedback</h3>
            <span className="text-sm text-gray-500 dark:text-gray-400">Total: {allUsersFeedback.length}</span>
          </div>

          {allUsersFeedback.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-gray-600 dark:text-gray-400">
                No feedback submitted yet.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {allUsersFeedback.map((feedback) => (
                <Card key={feedback.id}>
                  <CardContent className="pt-6">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-4">
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
                            {/* Status selector for users with manage_feedback permission */}
                            {canManageFeedback ? (
                              <select
                                value={feedback.status}
                                onChange={(e) => updateFeedbackStatus(feedback.id, e.target.value as any)}
                                disabled={updatingFeedbackId === feedback.id}
                                className="text-xs px-2 py-1 rounded border bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 cursor-pointer hover:border-gray-400 dark:hover:border-gray-500 disabled:opacity-50"
                              >
                                <option value="new">New</option>
                                <option value="in_progress">In Progress</option>
                                <option value="completed">Completed</option>
                                <option value="resolved">Resolved</option>
                                <option value="cancelled">Cancelled</option>
                              </select>
                            ) : (
                              <Badge className="text-xs">
                                {feedback.status === "new"
                                  ? "New"
                                  : feedback.status === "in_progress"
                                    ? "In Progress"
                                    : feedback.status === "completed"
                                      ? "Completed"
                                      : feedback.status === "resolved"
                                        ? "Resolved"
                                        : "Cancelled"}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Submitted by: <span className="font-medium">{feedback.userName}</span> ({feedback.userEmail})
                          </p>
                        </div>
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className="h-4 w-4"
                              fill={star <= (feedback.rating || 0) ? "currentColor" : "none"}
                              color={star <= (feedback.rating || 0) ? "#fbbf24" : "#d1d5db"}
                            />
                          ))}
                        </div>
                      </div>
                      <p className="text-gray-700 dark:text-gray-300 text-sm">{feedback.comment}</p>

                      {feedback.attachments && feedback.attachments.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                          <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                            Attachments ({feedback.attachments.length})
                          </p>
                          <div className="space-y-1">
                            {feedback.attachments.map((att) => (
                              <a
                                key={att.id}
                                href={`/api/feedback/attachments/${feedback.id}--${att.id}`}
                                download={att.name}
                                className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                              >
                                <Download className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                <span className="text-xs font-medium text-gray-700 dark:text-gray-300 flex-1 truncate">
                                  {att.name}
                                </span>
                                <span className="text-xs text-gray-500 dark:text-gray-500">({formatFileSize(att.size)})</span>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">{formatDate(feedback.createdAt)}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
