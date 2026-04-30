"use client"

import { useState, useEffect } from "react"
import { CommentForm } from "./CommentForm"

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
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  })
}

export function CommentsTab({
  requestId,
  comments,
  onAddComment,
  onDeleteComment,
  currentUserId,
  isLoading = false,
}: CommentsTabProps) {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const isAuthor = (commentAuthorId: string) => currentUserId === commentAuthorId

  return (
    <div className="space-y-6">
      {/* Add Comment Form */}
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
        <p className="text-sm font-medium text-gray-700 mb-3">Add Comment</p>
        <CommentForm onSubmit={onAddComment} isLoading={isLoading} />
      </div>

      {/* Comments List */}
      <div className="space-y-4">
        {comments && comments.length > 0 ? (
          comments.map((comment) => (
            <div key={comment.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
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
                    <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-semibold">
                      {comment.author?.name?.charAt(0)?.toUpperCase() || "?"}
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{comment.author?.name || "Anonymous"}</p>
                    {isMounted && <p className="text-xs text-gray-500">{formatDate(comment.createdAt)}</p>}
                  </div>
                </div>

                {/* No action menu - comments cannot be deleted */}
              </div>

              {/* Content */}
              <p className="text-sm text-gray-700 whitespace-pre-wrap mb-3">{comment.content}</p>

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
          ))
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p className="text-sm">No comments yet. Be the first to comment!</p>
          </div>
        )}
      </div>
    </div>
  )
}
