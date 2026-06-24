"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { ArrowLeft, Calendar, User, FileText, Clock, CheckCircle2, AlertCircle, ChevronDown, Star, Send } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { commentsAPI } from "@/lib/apiClient"
import { getRequests, updateStatus, updateAdminCc, getAllCcEmails, initializeMockData, recordCommentActivity, assignRequest, type EngineRequest } from "@/services/engineService"
import { AssigneeSelect } from "@/components/ui/AssigneeSelect"
import { hasPermission as hasPerm } from "@/lib/access"
import { cn, fmtDate, fmtDateTime } from "@/lib/utils"
import { hasPermission } from "@/lib/access"
import { createRequestUpdateNotifications, createAssignmentNotifications } from "@/lib/notificationStore"
import { CommentsTab } from "@/components/request/CommentsTab"
import { invalidateCommentCountCache } from "@/hooks/useCommentCounts"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MarkdownDisplay } from "@/components/ui/MarkdownDisplay"

const STATUS_COLORS: Record<string, string> = {
  draft:             "bg-zinc-100 text-zinc-600",
  new:               "bg-sky-100 text-sky-700",
  in_progress:       "bg-blue-100 text-blue-700",
  on_hold:           "bg-blue-100 text-blue-700", // legacy alias
  in_customs:        "bg-amber-100 text-amber-700",
  awaiting_approval: "bg-amber-100 text-amber-700",
  delivered:         "bg-green-100 text-green-700",
  completed:         "bg-emerald-100 text-emerald-700",
  cancelled:         "bg-red-100 text-red-600",
}

const STATUS_DOT: Record<string, string> = {
  draft:             "bg-zinc-400",
  new:               "bg-sky-500",
  in_progress:       "bg-blue-500",
  on_hold:           "bg-blue-500",
  in_customs:        "bg-amber-500",
  awaiting_approval: "bg-amber-500",
  delivered:         "bg-green-500",
  completed:         "bg-emerald-500",
  cancelled:         "bg-red-500",
}

const getStatusLabel = (status: string, _module?: string): string => {
  // Status codes match UI labels 1:1.
  if (status === 'new') return 'New'
  if (status === 'on_hold' || status === 'in_progress') return 'In Progress'
  if (status === 'in_customs') return 'In Customs'
  if (status === 'awaiting_approval') return 'Awaiting Approval'
  if (status === 'delivered') return 'Delivered'
  if (status === 'completed') return 'Completed'
  if (status === 'cancelled') return 'Cancelled'
  return status.replace(/_/g, ' ').charAt(0).toUpperCase() + status.replace(/_/g, ' ').slice(1)
}

interface RequestDetail {
  id: string
  title: string
  description?: string
  module: string
  status: string
  payload: Record<string, any>
  requesterId: string
  createdAt: string
  updatedAt: string
  ccEmails: string[]
  adminCc: string[]
  assignedToId?: string | null
  assignedToName?: string | null
  assignedToEmail?: string | null
  requester?: {
    id: string
    name: string
    email: string
    picture?: string
  }
  approvals: any[]
  attachments: any[]
  comments: any[]
  history: Array<{
    id: string
    action: string
    fieldName?: string
    oldValue?: any
    newValue?: any
    changedByUserId: string
    changedByUser?: {
      id: string
      name: string
      email: string
    }
    createdAt: string
  }>
}


function getModuleIcon(module: string) {
  switch (module) {
    case "shipping":
      return "📦"
    case "hr":
      return "👥"
    case "maintenance":
      return "🔧"
    case "purchase":
      return "🛒"
    default:
      return "📄"
  }
}

function getModuleColor(module: string) {
  switch (module) {
    case "shipping":
      return "bg-blue-50 text-blue-700 border-blue-200"
    case "hr":
      return "bg-teal-50 text-teal-700 border-teal-200"
    case "maintenance":
      return "bg-purple-50 text-purple-700 border-purple-200"
    case "purchase":
      return "bg-green-50 text-green-700 border-green-200"
    default:
      return "bg-gray-50 text-gray-700 border-gray-200"
  }
}

type Tab = "details" | "activity" | "comments" | "attachments"

export default function RequestDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const { data: session, status: sessionStatus } = useSession()

  const [request, setRequest] = useState<RequestDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>("details")
  const [surveyRating, setSurveyRating] = useState(0)
  const [surveyHover, setSurveyHover] = useState(0)
  const [surveyComment, setSurveyComment] = useState("")
  const [surveySubmitted, setSurveySubmitted] = useState(false)
  const [approvalEmailStatus, setApprovalEmailStatus] = useState<{
    type: "idle" | "sending" | "success" | "error"
    message: string
  }>({ type: "idle", message: "" })

  const fetchComments = async (requestId: string) => {
    try {
      const commentsData = await commentsAPI.list(requestId)
      const comments = commentsData.data || []

      // Extract attachments from comments
      const commentAttachments = comments.flatMap((comment: any) =>
        (comment.attachments || []).map((att: any) => ({
          ...att,
          source: 'comment',
          commentAuthor: comment.author?.name || 'Unknown',
        }))
      )

      setRequest((prev) => {
        if (!prev) return null
        return {
          ...prev,
          comments: comments,
          attachments: [
            ...(prev.attachments?.filter((a: any) => a.source !== 'comment') || []),
            ...commentAttachments,
          ],
        }
      })
    } catch (err) {
      console.log("Error fetching comments:", err)
    }
  }

  const canChangeStatus = session?.user?.permissions && hasPermission(session.user.permissions, "update_status")
  const canViewActivity = session?.user?.permissions && hasPermission(session.user.permissions, "activity")
  const canEditRequest = session?.user?.permissions && hasPermission(session.user.permissions, "edit_request")
  const canManageCc = session?.user?.permissions ? hasPermission(session.user.permissions, "manage_users") : false
  const currentUserId = session?.user?.id || "USR-001"
  const currentUserEmail = session?.user?.email || ""

  useEffect(() => {
    if (!canViewActivity && activeTab === "activity") {
      setActiveTab("details")
    }
  }, [activeTab, canViewActivity])

  const canAssign = hasPerm(session?.user?.permissions, "assign_requests")

  const handleAssign = async (assignee: { id: string; name: string; email: string } | null) => {
    if (!request || !canAssign) return
    const updated = await assignRequest(request.id, assignee)
    setRequest((prev) => prev ? {
      ...prev,
      assignedToId: updated?.assignedToId ?? null,
      assignedToName: updated?.assignedToName ?? null,
      assignedToEmail: updated?.assignedToEmail ?? null,
      updatedAt: updated?.updatedAt ?? prev.updatedAt,
    } : prev)
    if (assignee) {
      createAssignmentNotifications({
        requestId: request.id,
        requestTitle: request.title,
        module: request.module,
        assigneeId: assignee.id,
        assigneeName: assignee.name,
        assigneeEmail: assignee.email,
        actorName: session?.user?.name ?? undefined,
        actorEmail: session?.user?.email ?? undefined,
      })
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    if (!request || !canChangeStatus) return
    try {
      const now = new Date().toISOString()
      const oldStatus = request.status

      // Update in engineService
      await updateStatus(request.id, newStatus as any, currentUserId)
      if ((request.module === "purchase" || request.module === "shipping") && newStatus === "awaiting_approval" && oldStatus !== newStatus) {
        setApprovalEmailStatus({
          type: "success",
          message: "Approval email sent to the Direct Manager.",
        })
      }

      // Create new activity entry for status change
      const newStatusActivity = {
        id: `${request.id}-${now}`,
        action: 'status_changed',
        fieldName: 'status',
        oldValue: oldStatus,
        newValue: newStatus,
        changedByUserId: currentUserId,
        changedByUser: {
          id: currentUserId,
          name: session?.user?.name || "User",
          email: session?.user?.email || "user@si-ware.com",
        },
        createdAt: now,
      }

      // Create notifications for the request update
      createRequestUpdateNotifications({
        requestId: request.id,
        requestTitle: request.title,
        module: request.module,
        requestOwnerId: request.requester?.id || "USR-001",
        requestOwnerEmail: request.requester?.email,
        actionUserId: currentUserId,
        actionUserName: session?.user?.name || "User",
        actionUserEmail: session?.user?.email || undefined,
        preview: `Status changed from ${oldStatus} to ${newStatus}`,
        previousStatus: oldStatus,
        newStatus,
        updateType: "status",
        ccEmails: [...(request.ccEmails || []), ...(request.adminCc || [])],
      })

      // Update local state with new status and activity
      const updatedHistory = [...(request.history || []), newStatusActivity]
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

      setRequest({
        ...request,
        status: newStatus,
        updatedAt: now,
        history: updatedHistory,
      })

      // Send feedback survey email when request reaches completed or delivered
      if (
        (newStatus === "completed" || newStatus === "delivered") &&
        oldStatus !== "completed" && oldStatus !== "delivered"
      ) {
        const surveyId = `FB-${Date.now()}`
        fetch("/api/feedback/send-survey", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            surveyId,
            requesterName: request.requester?.name || request.title,
            requesterEmail: request.requester?.email,
            requestId: request.id,
            requestTitle: request.title,
            module: request.module,
          }),
        }).catch(() => {})
      }
    } catch (error) {
      console.error("Failed to update status:", error)
      const message = error instanceof Error ? error.message : "Failed to update status"
      setApprovalEmailStatus({ type: "error", message })
      alert(message)
    }
  }

  const handleResendApprovalEmail = async () => {
    if (!request) return
    setApprovalEmailStatus({ type: "sending", message: "Sending approval email..." })
    try {
      const response = await fetch(
        `/api/requests/${encodeURIComponent(request.id)}/send-approval-email`,
        { method: "POST" }
      )
      const body = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(body?.error ?? `Approval email failed (${response.status})`)
      }
      setApprovalEmailStatus({
        type: "success",
        message: `Approval email sent to ${body?.to ?? "the Direct Manager"}.`,
      })
    } catch (error) {
      setApprovalEmailStatus({
        type: "error",
        message: error instanceof Error ? error.message : "Approval email failed",
      })
    }
  }

  const getStatusesByModule = (module: string): string[] => {
    const moduleStatuses: Record<string, string[]> = {
      shipping:    ['new', 'awaiting_approval', 'in_progress', 'in_customs', 'delivered', 'cancelled'],
      hr:          ['new', 'in_progress', 'completed'],
      maintenance: ['new', 'in_progress', 'completed', 'cancelled'],
      purchase:    ['new', 'in_progress', 'awaiting_approval', 'delivered', 'cancelled'],
      event:       ['new', 'in_progress', 'delivered', 'completed', 'cancelled'],
      travel:      ['new', 'awaiting_approval', 'in_progress', 'completed', 'cancelled'],
      general:     ['new', 'in_progress', 'completed', 'cancelled'],
    }
    return moduleStatuses[module] || ['new', 'in_progress', 'completed', 'cancelled']
  }

  const STATUSES = request ? getStatusesByModule(request.module) : ['new', 'in_progress', 'completed', 'cancelled']

  useEffect(() => {
    const fetchRequest = async () => {
      try {
        setLoading(true)
        initializeMockData()

        // Always load the full request from the server first. The browser
        // cache may intentionally omit base64 attachment data when
        // localStorage reaches its quota, so it is not authoritative for
        // request details or the Attachments tab.
        let engineRequest: EngineRequest | undefined
        try {
          const response = await fetch(`/api/requests?id=${encodeURIComponent(id)}`, {
            cache: "no-store",
          })
          if (response.ok) {
            const json = await response.json()
            engineRequest = json?.request as EngineRequest | undefined
          }
        } catch {
          // Fall back to local data below for offline/pending requests.
        }

        if (!engineRequest) {
          engineRequest = getRequests().find((req) => req.id === id)
        }

        if (!engineRequest) {
          setError("Request not found")
          return
        }

        // Resolve user IDs in the activity log (changedBy) to actual names
        // + emails via the user directory. Without this, the timeline just
        // shows raw "USR-1779…" identifiers.
        const userMap = new Map<string, { name: string; email: string }>()
        try {
          const dirRes = await fetch("/api/users/directory")
          if (dirRes.ok) {
            const dirJson = await dirRes.json()
            const users = Array.isArray(dirJson?.data) ? dirJson.data : []
            for (const u of users) {
              userMap.set(u.id, { name: u.name ?? u.email ?? u.id, email: u.email ?? "" })
            }
          }
        } catch {
          // Best-effort. Fall back to raw IDs if the directory fetch fails.
        }
        // Always recognise the request's own requester even if they're not
        // in the active directory list.
        if (engineRequest.requesterId) {
          userMap.set(engineRequest.requesterId, {
            name: engineRequest.requesterName ?? engineRequest.requesterId,
            email: engineRequest.requesterEmail ?? "",
          })
        }
        const resolveActor = (id?: string) => {
          if (!id) return { name: "System", email: "" }
          const hit = userMap.get(id)
          if (hit) return hit
          // Pre-existing entries sometimes stored the email AS the changedBy.
          if (id.includes("@")) return { name: id, email: id }
          // Last-resort fallback: keep the raw id so it's at least traceable.
          return { name: id, email: "" }
        }

        // Convert EngineRequest to RequestDetail
        // Map statusHistory entries
        const statusHistoryEntries = engineRequest.statusHistory?.map((sh: any, idx: number) => {
          // Get the previous status (oldValue) from the previous entry if it exists
          const previousStatus = idx > 0 ? engineRequest.statusHistory[idx - 1]?.status : undefined
          const actor = resolveActor(sh.changedBy)
          return {
            id: `${engineRequest.id}-${sh.changedAt}`,
            action: 'status_changed',
            fieldName: 'status',
            oldValue: previousStatus,
            newValue: sh.status,
            changedByUserId: sh.changedBy,
            changedByUser: {
              id: sh.changedBy,
              name: actor.name,
              email: actor.email,
            },
            createdAt: sh.changedAt,
          }
        }) || []

        // Map commentHistory entries
        const commentHistoryEntries = engineRequest.commentHistory?.map((ca: any) => {
          const actor = resolveActor(ca.changedBy)
          return {
            id: `${engineRequest.id}-${ca.changedAt}`,
            action: 'comment_added',
            changedByUserId: ca.changedBy,
            changedByUser: {
              id: ca.changedBy,
              name: actor.name,
              email: actor.email,
            },
            createdAt: ca.changedAt,
          }
        }) || []

        // Combine and sort all history by date
        const allHistory = [...statusHistoryEntries, ...commentHistoryEntries]
          .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

        let foundRequest: RequestDetail = {
          id: engineRequest.id,
          title: engineRequest.title,
          description: (engineRequest.payload?.description as string | undefined) || undefined,
          module: engineRequest.module,
          status: engineRequest.status,
          payload: engineRequest.payload || {},
          requesterId: engineRequest.requesterId,
          ccEmails: Array.isArray((engineRequest.payload as any)?.ccEmails) ? (engineRequest.payload as any).ccEmails : [],
          adminCc: Array.isArray(engineRequest.adminCc) ? engineRequest.adminCc : [],
          requester: {
            id: engineRequest.requesterId,
            name: engineRequest.requesterName,
            email: engineRequest.requesterEmail,
          },
          assignedToId: engineRequest.assignedToId ?? null,
          assignedToName: engineRequest.assignedToName ?? null,
          assignedToEmail: engineRequest.assignedToEmail ?? null,
          createdAt: engineRequest.createdAt,
          updatedAt: engineRequest.updatedAt,
          approvals: [],
          attachments: extractRequestAttachments(engineRequest) as any[],
          comments: [],
          history: allHistory,
        }

        // Fetch comments for this request
        try {
          const commentsData = await commentsAPI.list(id)
          const comments = commentsData.data || []

          // Extract attachments from comments and add them to the main attachments list
          const commentAttachments = comments.flatMap((comment: any) =>
            (comment.attachments || []).map((att: any) => ({
              ...att,
              source: 'comment',
              commentAuthor: comment.author?.name || 'Unknown',
            }))
          )

          foundRequest = {
            ...foundRequest,
            comments: comments,
            attachments: [
              ...(foundRequest.attachments || []),
              ...commentAttachments,
            ],
          }
        } catch (err) {
          console.log("No comments found or error fetching comments:", err)
          // Comments are optional, continue without them
        }

        setRequest(foundRequest)

        // Restore feedback state if already submitted for this request
        try {
          const res = await fetch("/api/feedback/responses")
          if (res.ok) {
            const data = await res.json()
            const existing = (data.responses ?? []).find((r: any) => r.requestId === foundRequest.id)
            if (existing) {
              setSurveySubmitted(true)
              setSurveyRating(existing.rating ?? 0)
              setSurveyComment(existing.comment ?? "")
            }
          }
        } catch { /* feedback state restore is best-effort */ }
      } catch (err) {
        console.error("Failed to fetch request:", err)
        setError(err instanceof Error ? err.message : "Failed to fetch request")
      } finally {
        setLoading(false)
      }
    }

    if (id) {
      fetchRequest()
    }
  }, [id])

  // Mark comments as viewed
  useEffect(() => {
    if (request && request.comments && request.comments.length > 0) {
      const viewed = localStorage.getItem('arp_viewed_comments')
      const viewedComments = viewed ? JSON.parse(viewed) : {}
      viewedComments[request.id] = request.comments.length
      localStorage.setItem('arp_viewed_comments', JSON.stringify(viewedComments))
    }
  }, [request?.id, request?.comments.length])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          <p className="mt-4 text-muted-foreground">Loading request details...</p>
        </div>
      </div>
    )
  }

  if (error || !request) {
    return (
      <div className="space-y-6">
        <Link
          href="/requests"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Requests
        </Link>
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center gap-3 text-center">
              <AlertCircle className="h-8 w-8 text-red-500" />
              <p className="font-medium text-red-700">{error || "Request not found"}</p>
              <Button onClick={() => router.push("/requests")} variant="outline" className="mt-4">
                Return to Requests
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Link
        href="/requests"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Requests
      </Link>

      {/* Header Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">{getModuleIcon(request.module)}</span>
                  <Badge className={`${getModuleColor(request.module)} border capitalize`}>
                    {request.module}
                  </Badge>

                  {/* Status Dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        disabled={!canChangeStatus}
                        className={cn(
                          `${STATUS_COLORS[request.status] || "bg-gray-100"} border-0`,
                          !canChangeStatus && "cursor-not-allowed opacity-70"
                        )}
                      >
                        <span className={`inline-block h-2 w-2 rounded-full mr-1.5 ${STATUS_DOT[request.status] || "bg-gray-400"}`} />
                        {getStatusLabel(request.status, request.module)}
                        <ChevronDown className="h-4 w-4 ml-1" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-48">
                      {STATUSES.map((status) => (
                        <DropdownMenuItem
                          key={status}
                          onClick={() => handleStatusChange(status)}
                          className={cn(
                            "capitalize cursor-pointer",
                            request.status === status && "bg-blue-50 font-medium"
                          )}
                        >
                          <span className={`inline-block h-2 w-2 rounded-full mr-2 ${STATUS_DOT[status] || "bg-gray-400"}`} />
                          {getStatusLabel(status, request.module)}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Edit Button */}
                  {canEditRequest && (
                    <Button
                      variant="outline"
                      onClick={() => window.open(`/${request.module}/new?id=${request.id}`, '_blank')}
                      className="ml-auto"
                    >
                      Edit
                    </Button>
                  )}
                </div>
                <h1 className="text-3xl font-bold tracking-tight">{request.title}</h1>
                <p className="text-sm text-muted-foreground mt-1">Request ID: {request.id}</p>
              </div>
            </div>

            {request.description && (
              <div className="pt-4 border-t">
                <MarkdownDisplay content={request.description} />
              </div>
            )}

            {(request.module === "purchase" || request.module === "shipping" || request.module === "travel") && request.status === "awaiting_approval" && (
              <div className="flex flex-col gap-2 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-amber-800">{request.module === "travel" ? "Authorized Manager" : "Direct Manager"} approval is required</p>
                  {approvalEmailStatus.message && (
                    <p className={cn(
                      "mt-1 text-xs",
                      approvalEmailStatus.type === "error" ? "text-red-600" : "text-emerald-600"
                    )}>
                      {approvalEmailStatus.message}
                    </p>
                  )}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleResendApprovalEmail}
                  disabled={approvalEmailStatus.type === "sending"}
                  className="border-amber-300 text-amber-800 hover:bg-amber-50"
                >
                  <Send className="mr-2 h-4 w-4" />
                  {approvalEmailStatus.type === "sending" ? "Sending..." : "Resend Approval Email"}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Card>
        <div className="border-b">
          <div className="flex gap-8 px-6 bg-white rounded-t-lg">
            {[
              { id: "details", label: "Details" },
              ...(canViewActivity ? [{ id: "activity", label: `Activity ${request.history?.length ? `(${request.history.length})` : ""}` }] : []),
              { id: "comments", label: `Comments ${request.comments?.length ? `(${request.comments.length})` : ""}` },
              { id: "attachments", label: `Attachments ${request.attachments?.length ? `(${request.attachments.length})` : ""}` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as Tab)}
                className={cn(
                  "py-4 px-1 border-b-2 font-medium text-sm transition-colors",
                  activeTab === tab.id
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-600 hover:text-gray-900"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <CardContent className="pt-6">
          {/* Details Tab */}
          {activeTab === "details" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Requester */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Requester
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="font-medium">{request.requester?.name || "Unknown"}</p>
                    <p className="text-xs text-muted-foreground">{request.requester?.email || request.requesterId}</p>
                  </CardContent>
                </Card>

                {/* Created Date */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Created
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{fmtDateTime(request.createdAt)}</p>
                  </CardContent>
                </Card>

                {/* Last Updated */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Last Updated
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{fmtDateTime(request.updatedAt)}</p>
                  </CardContent>
                </Card>

                {/* Assigned To */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Assigned To
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <AssigneeSelect
                      value={request.assignedToId ?? null}
                      onChange={handleAssign}
                      disabled={!canAssign}
                    />
                    {!canAssign && !request.assignedToId && (
                      <p className="text-xs text-muted-foreground mt-2">No assignee yet</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Request Payload Details */}
              {Object.keys(request.payload).length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Request Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Object.entries(request.payload)
                        // ccEmails has its own panel; attachments has its own tab.
                        // Skip empty values so the grid doesn't show 20 blank rows.
                        .filter(([key, value]) => {
                          // Skip ccEmails and all attachment-related fields
                          if (key === "ccEmails" || key === "attachments") return false
                          // Skip individual attachment fields (travelRequestForm, passport, amanSticker, flightPhoto, visaDocument, etc.)
                          if (key.includes("attachment") || key.includes("Attachment")) return false
                          // Skip known file upload fields
                          const fileFields = ["travelRequestForm", "passport", "amanSticker", "visaDocument", "aman_sticker", "flightPhoto", "flight_photo", "visaDoc", "visa_doc"]
                          if (fileFields.includes(key)) return false
                          if (value == null) return false
                          if (typeof value === "string" && value.trim() === "") return false
                          if (Array.isArray(value) && value.length === 0) return false
                          return true
                        })
                        .map(([key, value]) => (
                          <PayloadField key={key} fieldKey={key} value={value} />
                        ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Activity Tab */}
          {canViewActivity && activeTab === "activity" && (
            <div className="space-y-4">
              {request.history && request.history.length > 0 ? (
                request.history.map((item, idx) => (
                  <div key={item.id} className="flex gap-4">
                    <div className="relative flex flex-col items-center">
                      <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <CheckCircle2 className="h-4 w-4 text-blue-600" />
                      </div>
                      {idx < request.history.length - 1 && <div className="w-0.5 h-12 bg-gray-200 my-2" />}
                    </div>
                    <div className="flex-1 pt-1 pb-4">
                      <p className="text-sm font-semibold text-gray-900 capitalize">
                        {item.action.replace(/_/g, " ")}
                      </p>
                      {item.action === 'status_changed' && (
                        <p className="text-xs text-gray-600 mt-1">
                          {item.oldValue ? (
                            <>
                              Changed from <span className="font-medium capitalize">{String(item.oldValue).replace(/_/g, ' ')}</span> to{" "}
                              <span className="font-medium capitalize">{String(item.newValue).replace(/_/g, ' ')}</span>
                            </>
                          ) : (
                            <>
                              Status set to <span className="font-medium capitalize">{String(item.newValue).replace(/_/g, ' ')}</span>
                            </>
                          )}
                        </p>
                      )}
                      <div className="flex items-center justify-between mt-2 text-xs text-gray-500 gap-3">
                        <span className="truncate">
                          By <span className="font-medium">{item.changedByUser?.name || item.changedByUserId}</span>
                          {item.changedByUser?.email && item.changedByUser.email !== item.changedByUser.name && (
                            <span className="text-gray-400 ml-1">&lt;{item.changedByUser.email}&gt;</span>
                          )}
                        </span>
                        <span className="flex-shrink-0">{fmtDateTime(item.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>No activity yet</p>
                </div>
              )}
            </div>
          )}

          {/* Comments Tab */}
          {activeTab === "comments" && (
            <CommentsTab
              requestId={request.id}
              comments={request.comments || []}
              ccEmails={request.ccEmails || []}
              adminCc={request.adminCc || []}
              canEditCc={sessionStatus === "authenticated" && hasPermission(session?.user?.permissions ?? [], "manage_cc")}
              onAdminCcChange={(emails) => {
                updateAdminCc(request.id, emails)
                setRequest((prev) => prev ? { ...prev, adminCc: emails } : prev)
              }}
              onAddComment={async (content, attachments) => {
                try {
                  console.log("Adding comment to request", request.id, { content, attachmentsCount: attachments.length })
                  const result = await commentsAPI.create(
                    request.id,
                    content,
                    currentUserId,
                    session?.user?.name || request.requester?.name || "User",
                    session?.user?.email || request.requester?.email || "user@si-ware.com",
                    attachments.length > 0 ? attachments : undefined
                  )
                  console.log("Comment created:", result)

                  // Record comment activity in history
                  recordCommentActivity(request.id, currentUserId)

                  // Create notifications for the new comment (with CC)
                  createRequestUpdateNotifications({
                    requestId: request.id,
                    requestTitle: request.title,
                    module: request.module,
                    requestOwnerId: request.requester?.id || "USR-001",
                    requestOwnerEmail: request.requester?.email,
                    actionUserId: currentUserId,
                    actionUserName: session?.user?.name || "User",
                    actionUserEmail: session?.user?.email || undefined,
                    preview: content,
                    updateType: "comment",
                    ccEmails: [...(request.ccEmails || []), ...(request.adminCc || [])],
                  })

                  // Add optimistic update - add comment immediately to state
                  const newComment = {
                    id: result?.id || `${Date.now()}`,
                    content: content,
                    author: {
                      id: currentUserId,
                      name: session?.user?.name || "User",
                      email: session?.user?.email || "user@si-ware.com",
                    },
                    attachments: result?.attachments || [],
                    createdAt: new Date().toISOString(),
                  }

                  // Add a new activity entry for the comment
                  const now = new Date().toISOString()
                  const newCommentActivity = {
                    id: `${request.id}-${now}`,
                    action: 'comment_added',
                    changedByUserId: currentUserId,
                    changedByUser: {
                      id: currentUserId,
                      name: session?.user?.name || request.requester?.name || "User",
                      email: session?.user?.email || session?.user?.email || request.requester?.email || "user@si-ware.com",
                    },
                    createdAt: now,
                  }

                  // Update the request's history and comments immediately
                  const updatedHistory = [...(request.history || []), newCommentActivity]
                    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

                  setRequest({
                    ...request,
                    comments: [...(request.comments || []), newComment],
                    history: updatedHistory,
                  })

                  // Invalidate comment count cache so it refetches on next page navigation
                  invalidateCommentCountCache(request.id)

                  // Then refetch comments to sync with server
                  await fetchComments(request.id)
                } catch (error) {
                  console.error("Failed to add comment:", error)
                  alert(`Failed to add comment: ${error instanceof Error ? error.message : 'Unknown error'}`)
                }
              }}
              onDeleteComment={async (commentId) => {
                try {
                  await commentsAPI.delete(commentId)
                  // Refetch comments without reloading
                  await fetchComments(request.id)
                } catch (error) {
                  console.error("Failed to delete comment:", error)
                  alert("Failed to delete comment. Please try again.")
                }
              }}
              currentUserId={currentUserId}
            />
          )}

          {/* Attachments Tab */}
          {activeTab === "attachments" && (
            <div className="space-y-2">
              {request.attachments && request.attachments.length > 0 ? (
                request.attachments.map((attachment: any) => {
                  // For inline preview we proxy data: URLs through a server
                  // route so the browser sees a normal HTTPS URL (Chrome
                  // blocks top-level navigation to data: URLs as a phishing
                  // protection). The proxy decodes the data URL and serves
                  // it with the correct Content-Type so previews render in
                  // a new tab.
                  //
                  // We address attachments by their `id` field — the list
                  // mixes request-payload attachments with comment-thread
                  // attachments, so a positional index would be ambiguous.
                  const isDataUrl = (attachment.url ?? "").startsWith("data:")
                  const isBlobUrl = (attachment.url ?? "").startsWith("blob:")
                  const previewUrl = isDataUrl
                    ? `/api/requests/${request.id}/attachments/${encodeURIComponent(attachment.id)}`
                    : attachment.url
                  // Legacy blob: URLs only exist in the browser tab that
                  // created them, so they can't be opened for anyone else.
                  // Render them as a disabled row with a hint instead.
                  if (isBlobUrl) {
                    return (
                      <div
                        key={attachment.id}
                        className="flex items-center gap-3 p-4 border rounded-lg bg-amber-50/40 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900"
                      >
                        <FileText className="h-5 w-5 text-amber-600 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{attachment.name}</p>
                          <p className="text-xs text-amber-700 mt-1">
                            Legacy attachment — only viewable by the original uploader. Please re-upload to share with the team.
                          </p>
                        </div>
                      </div>
                    )
                  }
                  return (
                    <div
                      key={attachment.id}
                      className="flex items-center gap-3 p-4 border rounded-lg hover:bg-gray-50 hover:border-blue-300 transition-colors"
                    >
                      <FileText className="h-5 w-5 text-blue-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {attachment.name}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-xs text-gray-500">
                            {(attachment.sizeBytes / 1024).toFixed(1)} KB
                          </p>
                          {attachment.source === 'comment' && (
                            <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded">
                              From comment by {attachment.commentAuthor}
                            </span>
                          )}
                          {attachment._fieldLabel && (
                            <span className="text-xs bg-teal-50 text-teal-700 px-2 py-0.5 rounded capitalize">
                              {attachment._fieldLabel.replace(/([A-Z])/g, ' $1').trim()}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <a
                          href={previewUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-3 py-1.5 rounded transition-colors"
                          title="Preview in new tab"
                        >
                          Preview
                        </a>
                        <a
                          href={attachment.url}
                          download={attachment.name}
                          className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-3 py-1.5 rounded transition-colors"
                          title={isDataUrl ? "Download file" : "Download"}
                          onClick={(e) => e.stopPropagation()}
                        >
                          Download
                        </a>
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>No attachments</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Feedback Survey — hidden for Administration Team role (they process requests, not evaluate them) */}
      {(request.status === "completed" || request.status === "delivered") && session?.user?.role !== "Administration Team" && (
        <Card className="border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-white shadow-sm">
          <CardHeader className="pb-3 border-b border-emerald-100">
            <div className="flex items-center gap-3">
              <div className="bg-emerald-100 rounded-lg p-2">
                <Star className="h-5 w-5 text-emerald-700" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold text-gray-900">Service Feedback</CardTitle>
                <p className="text-xs text-gray-500 mt-0.5">How satisfied are you with this {request.module} request?</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {surveySubmitted ? (
              <div className="flex flex-col items-center py-6 text-center">
                <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center mb-3">
                  <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                </div>
                <p className="font-semibold text-gray-900">Thank you for your feedback!</p>
                <p className="text-sm text-gray-500 mt-1">Your response has been recorded.</p>
                <div className="flex gap-1 mt-3">
                  {[1,2,3,4,5].map((s) => (
                    <Star key={s} className={cn("h-5 w-5", s <= surveyRating ? "fill-yellow-400 text-yellow-400" : "text-gray-200")} />
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                {/* Star rating */}
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-3">Rate your experience</p>
                  <div className="flex gap-2">
                    {[1,2,3,4,5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setSurveyRating(star)}
                        onMouseEnter={() => setSurveyHover(star)}
                        onMouseLeave={() => setSurveyHover(0)}
                        className="p-1.5 rounded-lg transition-all hover:scale-110"
                      >
                        <Star className={cn(
                          "h-8 w-8 transition-colors",
                          (surveyHover || surveyRating) >= star
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-gray-300 hover:text-yellow-300"
                        )} />
                      </button>
                    ))}
                    {surveyRating > 0 && (
                      <span className="ml-2 self-center text-sm text-gray-600 font-medium">
                        {["Poor","Fair","Good","Very Good","Excellent"][surveyRating - 1]}
                      </span>
                    )}
                  </div>
                </div>

                {/* Comment */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Additional comments (optional)</label>
                  <textarea
                    value={surveyComment}
                    onChange={(e) => setSurveyComment(e.target.value)}
                    placeholder="Tell us what we can improve..."
                    rows={3}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent"
                  />
                </div>

                <Button
                  disabled={!surveyRating}
                  onClick={async () => {
                    if (!surveyRating || !request) return
                    // POST to server-side store. Falls back to session name/email if
                    // the request has stale "Unknown User" data, so the feedback row
                    // attributes correctly to the actual employee filling it out.
                    const sessionName = session?.user?.name ?? ""
                    const sessionEmail = session?.user?.email ?? ""
                    try {
                      const reqName = request.requester?.name
                      const reqEmail = request.requester?.email
                      const res = await fetch("/api/feedback/inline", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          requestId: request.id,
                          requestTitle: request.title,
                          module: request.module,
                          requesterName: (reqName && reqName !== "Unknown User") ? reqName : sessionName,
                          requesterEmail: reqEmail || sessionEmail,
                          rating: surveyRating,
                          comment: surveyComment,
                        }),
                      })
                      if (res.ok) setSurveySubmitted(true)
                    } catch (err) {
                      console.error("Failed to submit feedback:", err)
                    }
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                >
                  <Send className="h-4 w-4" />
                  Submit Feedback
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ─── extractRequestAttachments — collects all attachments from any module ────
// Different modules store attachments differently:
// - Most modules: payload.attachments[]
// - Travel: payload.amanSticker, payload.passport, payload.hotelPhoto,
//           payload.flightPhoto, payload.additionalAttachments[]

function extractRequestAttachments(request: any): any[] {
  const payload = request?.payload ?? {}
  const result: any[] = []

  // Standard array (HR, Maintenance, Purchase, Event, Shipping, General)
  if (Array.isArray(payload.attachments)) {
    result.push(...payload.attachments.filter(Boolean))
  }

  // Travel named fields
  const namedFields = ["amanSticker", "passport", "hotelPhoto", "flightPhoto"]
  for (const field of namedFields) {
    if (payload[field] && typeof payload[field] === "object" && payload[field].id) {
      result.push({ ...payload[field], _fieldLabel: field })
    }
  }

  // Travel additional attachments
  if (Array.isArray(payload.additionalAttachments)) {
    result.push(...payload.additionalAttachments.filter(Boolean))
  }

  // Deduplicate by id
  const seen = new Set<string>()
  return result.filter((a) => {
    if (!a?.id) return true
    if (seen.has(a.id)) return false
    seen.add(a.id)
    return true
  })
}

// ─── PayloadField — pretty renderer for request.payload entries ──────────────
// Replaces the previous JSON.stringify dump for nested values like
// `approvers` and `attachments`. Falls back to a short summary line when
// the structure is unfamiliar, instead of leaking raw blob: URLs and IDs.

function humanizeKey(key: string): string {
  // camelCase / snake_case → "Title Case"
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function PayloadField({ fieldKey, value }: { fieldKey: string; value: unknown }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
        {humanizeKey(fieldKey)}
      </p>
      <PayloadValue fieldKey={fieldKey} value={value} />
    </div>
  )
}

function PayloadValue({ fieldKey, value }: { fieldKey: string; value: unknown }) {
  // Skip attachments — they have their own dedicated tab
  if (fieldKey === "attachments") {
    return <p className="text-sm text-gray-500 italic">See Attachments tab</p>
  }

  // Approvers block — render Direct Manager + Tech/PM as a small named list.
  if (fieldKey === "approvers" && value && typeof value === "object") {
    const a = value as {
      directManager?: { name?: string; email?: string }
      techManager?: Array<{ name?: string; email?: string }>
      pm?: Array<{ name?: string; email?: string }>
    }
    const rows: { label: string; name?: string; email?: string }[] = []
    if (a.directManager?.name || a.directManager?.email) {
      rows.push({ label: "Direct Manager", name: a.directManager.name, email: a.directManager.email })
    }
    ;(a.techManager ?? []).forEach((p, i) =>
      rows.push({ label: `Tech Manager ${a.techManager!.length > 1 ? i + 1 : ""}`.trim(), name: p.name, email: p.email })
    )
    ;(a.pm ?? []).forEach((p, i) =>
      rows.push({ label: `PM ${a.pm!.length > 1 ? i + 1 : ""}`.trim(), name: p.name, email: p.email })
    )
    if (rows.length === 0) {
      return <p className="text-sm text-gray-500 italic">No approvers</p>
    }
    return (
      <ul className="text-sm space-y-1">
        {rows.map((r, idx) => (
          <li key={idx} className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-gray-500">{r.label}:</span>
            <span className="font-medium text-gray-900">{r.name || r.email || "—"}</span>
            {r.email && r.email !== r.name && (
              <span className="text-xs text-gray-400">{r.email}</span>
            )}
          </li>
        ))}
      </ul>
    )
  }

  // Arrays of strings → comma-separated chips.
  if (Array.isArray(value)) {
    if (value.length === 0) return <p className="text-sm text-gray-500 italic">None</p>
    if (value.every((v) => typeof v === "string" || typeof v === "number")) {
      return <p className="text-sm font-medium text-gray-900">{value.join(", ")}</p>
    }
    // Array of objects — try to find a readable label (name → title → id).
    return (
      <ul className="text-sm space-y-1">
        {value.map((item, idx) => {
          if (item && typeof item === "object") {
            const obj = item as Record<string, unknown>
            const label = (obj.name ?? obj.title ?? obj.label ?? obj.id ?? "Item") as string
            return <li key={idx} className="font-medium text-gray-900">{String(label)}</li>
          }
          return <li key={idx} className="font-medium text-gray-900">{String(item)}</li>
        })}
      </ul>
    )
  }

  // Plain object — render key/value lines instead of a JSON blob.
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).filter(
      ([, v]) => v != null && v !== ""
    )
    if (entries.length === 0) return <p className="text-sm text-gray-500 italic">—</p>
    return (
      <ul className="text-sm space-y-0.5">
        {entries.map(([k, v]) => (
          <li key={k} className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-gray-500">{humanizeKey(k)}:</span>
            <span className="font-medium text-gray-900">
              {typeof v === "object" ? JSON.stringify(v) : String(v)}
            </span>
          </li>
        ))}
      </ul>
    )
  }

  // Boolean
  if (typeof value === "boolean") {
    return <p className="text-sm font-medium text-gray-900">{value ? "Yes" : "No"}</p>
  }

  // String / number — capitalize known direction values for readability.
  const text = String(value)
  if (fieldKey === "direction") {
    return <p className="text-sm font-medium text-gray-900 capitalize">{text}</p>
  }
  return <p className="text-sm font-medium text-gray-900 break-words">{text}</p>
}
