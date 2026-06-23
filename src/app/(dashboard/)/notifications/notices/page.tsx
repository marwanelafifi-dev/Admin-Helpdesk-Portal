"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import {
  AlertCircle,
  Bug,
  Zap,
  Trash2,
  Edit2,
  Plus,
  X,
} from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { isSuperAdmin } from "@/lib/access"
import type { SystemNotice, NoticeType } from "@/lib/noticeStore"

const TYPE_CONFIG: Record<NoticeType, { icon: React.ReactNode; label: string; color: string; bg: string }> = {
  feature: {
    icon: <Zap className="h-4 w-4" />,
    label: "Feature",
    color: "text-green-700",
    bg: "bg-green-50 dark:bg-green-950/30",
  },
  bug_fix: {
    icon: <Bug className="h-4 w-4" />,
    label: "Bug Fix",
    color: "text-blue-700",
    bg: "bg-blue-50 dark:bg-blue-950/30",
  },
  update: {
    icon: <AlertCircle className="h-4 w-4" />,
    label: "Update",
    color: "text-gray-700 dark:text-gray-300",
    bg: "bg-gray-50 dark:bg-gray-950/30",
  },
}

function formatDate(isoString: string): string {
  try {
    return new Date(isoString).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  } catch {
    return isoString
  }
}

interface AddNoticeFormProps {
  onSubmit: (notice: Omit<SystemNotice, "id" | "lastUpdatedAt">) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
}

function AddNoticeForm({ onSubmit, onCancel, isLoading }: AddNoticeFormProps) {
  const [title, setTitle] = useState("")
  const [type, setType] = useState<NoticeType>("feature")
  const [summary, setSummary] = useState("")
  const [description, setDescription] = useState("")

  const isValid = title.trim() && summary.trim() && type

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isValid) return

    await onSubmit({
      title: title.trim(),
      type,
      summary: summary.trim(),
      description: description.trim() || undefined,
      postedAt: new Date().toISOString(),
    })

    setTitle("")
    setSummary("")
    setDescription("")
    setType("feature")
  }

  return (
    <Card className="mb-6 border-2 border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-950/20">
      <CardHeader>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">Add New Notice</h2>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              maxLength={100}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Event Module Now Live"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{title.length}/100</p>
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Type <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-3">
              {(["feature", "bug_fix", "update"] as const).map((t) => (
                <label key={t} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="type"
                    value={t}
                    checked={type === t}
                    onChange={() => setType(t)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{TYPE_CONFIG[t].label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Summary <span className="text-red-500">*</span>
            </label>
            <textarea
              maxLength={200}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Brief description visible in the list view"
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{summary.length}/200</p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Full Description <span className="text-gray-500">(optional)</span>
            </label>
            <textarea
              maxLength={5000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed explanation (supports line breaks)"
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{description.length}/5000</p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={onCancel} disabled={isLoading}>
              Cancel
            </Button>
            <Button variant="default" type="submit" disabled={!isValid || isLoading}>
              {isLoading ? "Creating..." : "Create Notice"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

interface EditNoticeFormProps {
  notice: SystemNotice
  onSubmit: (updates: Partial<SystemNotice>) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
}

function EditNoticeForm({ notice, onSubmit, onCancel, isLoading }: EditNoticeFormProps) {
  const [title, setTitle] = useState(notice.title)
  const [type, setType] = useState<NoticeType>(notice.type)
  const [summary, setSummary] = useState(notice.summary)
  const [description, setDescription] = useState(notice.description ?? "")

  const isValid = title.trim() && summary.trim() && type
  const hasChanges =
    title !== notice.title ||
    type !== notice.type ||
    summary !== notice.summary ||
    description !== (notice.description ?? "")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isValid || !hasChanges) return

    await onSubmit({
      title: title.trim(),
      type,
      summary: summary.trim(),
      description: description.trim() || undefined,
    })
  }

  return (
    <Card className="mb-6 border-2 border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/20">
      <CardHeader>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">Edit Notice</h2>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              maxLength={100}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-50 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{title.length}/100</p>
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Type <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-3">
              {(["feature", "bug_fix", "update"] as const).map((t) => (
                <label key={t} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="type"
                    value={t}
                    checked={type === t}
                    onChange={() => setType(t)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{TYPE_CONFIG[t].label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Summary <span className="text-red-500">*</span>
            </label>
            <textarea
              maxLength={200}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-50 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{summary.length}/200</p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Full Description <span className="text-gray-500">(optional)</span>
            </label>
            <textarea
              maxLength={5000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-50 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{description.length}/5000</p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={onCancel} disabled={isLoading}>
              Cancel
            </Button>
            <Button variant="default" type="submit" disabled={!isValid || !hasChanges || isLoading}>
              {isLoading ? "Updating..." : "Update Notice"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

interface NoticeCardProps {
  notice: SystemNotice
  isAdmin: boolean
  onEdit: (notice: SystemNotice) => void
  onDelete: (id: string) => void
  isDeleting?: boolean
}

function NoticeCard({ notice, isAdmin, onEdit, onDelete, isDeleting }: NoticeCardProps) {
  const config = TYPE_CONFIG[notice.type]
  const [expanded, setExpanded] = useState(false)

  return (
    <Card className={`border-l-4 ${notice.type === "feature" ? "border-l-green-500" : notice.type === "bug_fix" ? "border-l-blue-500" : "border-l-gray-500"}`}>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            {/* Header */}
            <div className="flex items-center gap-3 mb-2">
              <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium ${config.bg} ${config.color}`}>
                {config.icon}
                {config.label}
              </div>
              <time className="text-sm text-gray-500 dark:text-gray-400">{formatDate(notice.postedAt)}</time>
            </div>

            {/* Title */}
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50 mb-1">{notice.title}</h3>

            {/* Summary */}
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">{notice.summary}</p>

            {/* Description (expandable) */}
            {notice.description && (
              <div>
                {!expanded && (
                  <button
                    onClick={() => setExpanded(true)}
                    className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Show more
                  </button>
                )}
                {expanded && (
                  <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-950/50 rounded-lg border border-gray-200 dark:border-gray-700">
                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{notice.description}</p>
                    <button
                      onClick={() => setExpanded(false)}
                      className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline mt-2"
                    >
                      Show less
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Admin actions */}
          {isAdmin && (
            <div className="flex gap-2">
              <button
                onClick={() => onEdit(notice)}
                className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-900 rounded-lg transition"
                title="Edit notice"
              >
                <Edit2 className="h-4 w-4" />
              </button>
              <button
                onClick={() => onDelete(notice.id)}
                disabled={isDeleting}
                className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition disabled:opacity-50"
                title="Delete notice"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default function SystemNoticesPage() {
  const { data: session } = useSession()
  const [notices, setNotices] = useState<SystemNotice[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingNotice, setEditingNotice] = useState<SystemNotice | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const isAdmin = session?.user?.role === "Full Access" || isSuperAdmin(session?.user?.role)

  // Load notices
  useEffect(() => {
    async function loadNotices() {
      try {
        setIsLoading(true)
        setError(null)
        const response = await fetch("/api/notices")
        if (!response.ok) throw new Error("Failed to load notices")
        const data = await response.json()
        setNotices(data.data || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load notices")
      } finally {
        setIsLoading(false)
      }
    }
    loadNotices()
  }, [])

  async function handleCreateNotice(notice: Omit<SystemNotice, "id" | "lastUpdatedAt">) {
    try {
      setIsSubmitting(true)
      const response = await fetch("/api/admin/notices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(notice),
      })
      if (!response.ok) throw new Error("Failed to create notice")
      const created = await response.json()
      setNotices([created, ...notices])
      setShowForm(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create notice")
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleUpdateNotice(updates: Partial<SystemNotice>) {
    if (!editingNotice) return
    try {
      setIsSubmitting(true)
      const response = await fetch("/api/admin/notices", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingNotice.id, ...updates }),
      })
      if (!response.ok) throw new Error("Failed to update notice")
      const updated = await response.json()
      setNotices(notices.map((n) => (n.id === updated.id ? updated : n)))
      setEditingNotice(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update notice")
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDeleteNotice(id: string) {
    if (!confirm("Delete this notice?")) return
    try {
      setDeletingId(id)
      const response = await fetch(`/api/admin/notices?id=${id}`, { method: "DELETE" })
      if (!response.ok) throw new Error("Failed to delete notice")
      setNotices(notices.filter((n) => n.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete notice")
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-50">System Notices</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Stay informed about features, updates, and bug fixes
          </p>
        </div>
        {isAdmin && !showForm && !editingNotice && (
          <Button onClick={() => setShowForm(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Notice
          </Button>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-lg flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-red-800 dark:text-red-200">{error}</p>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 p-1 rounded"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <AddNoticeForm
          onSubmit={handleCreateNotice}
          onCancel={() => setShowForm(false)}
          isLoading={isSubmitting}
        />
      )}

      {/* Edit form */}
      {editingNotice && (
        <EditNoticeForm
          notice={editingNotice}
          onSubmit={handleUpdateNotice}
          onCancel={() => setEditingNotice(null)}
          isLoading={isSubmitting}
        />
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-40 bg-gray-100 dark:bg-gray-900 rounded-lg animate-pulse"
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && notices.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 text-gray-400 dark:text-gray-600 mx-auto mb-3 opacity-50" />
            <p className="text-gray-600 dark:text-gray-400">No system notices yet</p>
          </CardContent>
        </Card>
      )}

      {/* Notices list */}
      {!isLoading && notices.length > 0 && (
        <div className="space-y-4">
          {notices.map((notice) => (
            <NoticeCard
              key={notice.id}
              notice={notice}
              isAdmin={isAdmin}
              onEdit={setEditingNotice}
              onDelete={handleDeleteNotice}
              isDeleting={deletingId === notice.id}
            />
          ))}
        </div>
      )}
    </div>
  )
}
