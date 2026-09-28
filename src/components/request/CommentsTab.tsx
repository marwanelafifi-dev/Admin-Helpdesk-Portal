"use client"

import { useState, useEffect } from "react"
import { fmtDateTime } from "@/lib/utils"
import { CommentForm } from "./CommentForm"
import { CcPanel } from "./CcPanel"

export interface Comment {
  id: string
  content: string
  author: {
    id: string
    name: string
    email: string
    picture?: string
  }
  attachments?: Array<{
    id: string
    name: string
    url: string
    sizeBytes: number
  }>
  createdAt: string
  updatedAt?: string
}

interface CommentsTabProps {
  requestId: string
  comments: Comment[]
  onAddComment: (content: string, attachments: File[]) => Promise<void>
  onDeleteComment?: (commentId: string) => Promise<void>
  currentUserId?: string
  isLoading?: boolean
  // CC props
  ccEmails?: string[]
  adminCc?: string[]
  onAdminCcChange?: (emails: string[]) => void
  canEditCc?: boolean
}


export function CommentsTab({
  requestId,
  comments,
  onAddComment,
  onDeleteComment,
  currentUserId,
  isLoading = false,
  ccEmails = [],
  adminCc = [],
  onAdminCcChange,
  canEditCc = false,
}: CommentsTabProps) {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const isAuthor = (commentAuthorId: string) => currentUserId === commentAuthorId

  return (
    <div className="space-y-6">
      <CcPanel
        ccEmails={ccEmails}
        adminCc={adminCc}
        onAdminCcChange={onAdminCcChange ?? (() => {})}
        canEdit={canEditCc}
      />

      {/* Add Comment Form */}
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
        <p className="text-sm font-medium text-gray-700 mb-3">Add Comment</p>
        <CommentForm onSubmit={onAddComment} isLoading={isLoading} />
      </div>

      {/* Comments List */}
      <div className="space-y-4">
        {comments && comments.length > 0 ? (
          comments.map((comment) => {
            const isSlaReminder = comment.author?.id === "system-finance-sla"
            return (
            <div
              key={comment.id}
              className={isSlaReminder
                ? "rounded-lg border border-amber-300 bg-amber-50 p-4 shadow-sm dark:border-amber-500/40 dark:bg-amber-950/25"
                : "border rounded-lg p-4 hover:bg-gray-50 transition-colors"}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  {comment.author?.picture ? (
                    <img
                      src={comment.author.picture}
                      alt={comment.author.name}
                      className="h-8 w-8 rounded-full"
                    />
                  ) : (
                    <div className={isSlaReminder
                      ? "h-8 w-8 rounded-full bg-amber-500 flex items-center justify-center text-white text-xs font-semibold"
                      : "h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-semibold"}
                    >
                      {comment.author?.name?.charAt(0)?.toUpperCase() || "?"}
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{comment.author?.name || "Anonymous"}</p>
                      {isSlaReminder && <span className="rounded-full bg-amber-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-900 dark:bg-amber-500/20 dark:text-amber-200">SLA reminder</span>}
                    </div>
                    {isMounted && <p className="text-xs text-gray-500">{fmtDateTime(comment.createdAt)}</p>}
                  </div>
                </div>
              </div>

              {/* Content */}
              <p className={isSlaReminder
                ? "text-sm font-medium text-amber-950 whitespace-pre-wrap mb-3 dark:text-amber-100"
                : "text-sm text-gray-700 whitespace-pre-wrap mb-3 dark:text-gray-200"}
              >{comment.content}</p>

              {/* Attachments */}
              {comment.attachments && comment.attachments.length > 0 && (
                <div className="space-y-2 mt-3 pt-3 border-t">
                  <p className="text-xs font-medium text-gray-600">Attachments</p>
                  <div className="space-y-1">
                    {comment.attachments.map((attachment) => (
                      <a
                        key={attachment.id}
                        href={attachment.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 hover:underline"
                      >
                        📎 {attachment.name} ({(attachment.sizeBytes / 1024).toFixed(1)} KB)
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
            )
          })
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p className="text-sm">No comments yet. Be the first to comment!</p>
          </div>
        )}
      </div>
    </div>
  )
}
