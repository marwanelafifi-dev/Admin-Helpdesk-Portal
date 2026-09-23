"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { ArrowLeft, Calendar, User, FileText, Clock, CheckCircle2, AlertCircle, ChevronDown, Star, Send, Printer } from "lucide-react"
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
import { MANAGER_APPROVAL_MODULES } from "@/lib/functionRegistry"

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
  requesterEmail?: string
  requesterName?: string
  companyId?: "si_ware" | "buchi"
  companyName?: string
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

const FINANCE_TABLE_CURRENCIES = ["USD", "EUR", "EGP"] as const

function escapePrintHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

function printAmount(value: unknown): string {
  const amount = Number(value)
  return (Number.isFinite(amount) ? amount : 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function financeExpenseTotals(payload: Record<string, any>, rows: Array<Record<string, any>>) {
  const savedTotals = payload.poOption !== undefined ? payload.refundTotalsByCurrency ?? payload.totalsByCurrency : payload.totalsByCurrency
  const saved = savedTotals && typeof savedTotals === "object"
    ? savedTotals as Record<string, unknown>
    : {}

  return Object.fromEntries(FINANCE_TABLE_CURRENCIES.map((currency) => {
    const calculated = rows.reduce((sum, row) => {
      if (payload.poOption !== undefined) {
        const refundCurrency = row.refundCurrency ?? row.currency
        const refundAmount = row.refundAmount ?? row.amount
        return sum + (refundCurrency === currency && Number.isFinite(Number(refundAmount)) ? Number(refundAmount) : 0)
      }
      const legacyCurrency = Number(row.usdAmount ?? 0) > 0 ? "USD" : Number(row.eurAmount ?? 0) > 0 ? "EUR" : "EGP"
      const refundCurrency = row.refundCurrency ?? row.invoiceCurrency ?? legacyCurrency
      const refundAmount = row.refundAmount ?? row[`${legacyCurrency.toLowerCase()}Amount`]
      return sum + (refundCurrency === currency && Number.isFinite(Number(refundAmount)) ? Number(refundAmount) : 0)
    }, 0)
    // Row values are the source of truth. Saved totals may belong to an
    // older version of the form and can be stale after an edit.
    if (calculated !== 0) return [currency, calculated]
    const hasCurrencyColumn = rows.some((row) => payload.poOption !== undefined
      ? row.refundCurrency === currency || row.currency === currency
      : row.refundCurrency === currency || row.invoiceCurrency === currency || Object.prototype.hasOwnProperty.call(row, `${currency.toLowerCase()}Amount`))
    if (hasCurrencyColumn) return [currency, 0]
    const savedValue = Number(saved[currency])
    return [currency, Number.isFinite(savedValue) ? savedValue : 0]
  })) as Record<(typeof FINANCE_TABLE_CURRENCIES)[number], number>
}

function buildFinanceExpensePrintTable(module: string, payload: Record<string, any>): string {
  if (module === "finance_invoice_payment") {
    const rows = Array.isArray(payload.invoiceRows) && payload.invoiceRows.length > 0
      ? payload.invoiceRows as Array<Record<string, any>>
      : [{ supplier: payload.supplier, poNumber: Array.isArray(payload.poNumbers) ? payload.poNumbers.join(", ") : "", otherDescription: payload.otherDetails, amount: payload.amount, currency: payload.currency, paymentTerms: payload.paymentTerms, paymentMethod: payload.paymentMethod }]
    const totals = rows.reduce<Record<string, number>>((result, row) => {
      const currency = String(row.currency ?? "USD")
      result[currency] = (result[currency] ?? 0) + (Number.isFinite(Number(row.amount)) ? Number(row.amount) : 0)
      return result
    }, {})
    const isPo = payload.poOrContract === "po"
    const isOther = payload.poOrContract === "other"
    const body = rows.map((row) => `<tr><td>${escapePrintHtml(row.supplier || "—")}</td>${isPo ? `<td>${escapePrintHtml(row.poNumber || "—")}</td>` : ""}${isOther ? `<td>${escapePrintHtml(row.otherDescription || "—")}</td>` : ""}<td class="amount-cell">${printAmount(row.amount)}</td><td>${escapePrintHtml(row.currency || "—")}</td><td>${escapePrintHtml(row.paymentTerms || "—")}</td><td>${escapePrintHtml(row.paymentMethod || "—")}</td></tr>`).join("")
    const totalCells = Object.entries(totals).map(([currency, amount]) => `<span><strong>${escapePrintHtml(currency)}:</strong> ${printAmount(amount)}</span>`).join("")
    return `<div class="section expense-section"><div class="section-title">Invoice Details</div><table class="expense-table"><thead><tr><th>Supplier</th>${isPo ? "<th>PO Number</th>" : ""}${isOther ? "<th>Description</th>" : ""}<th class="amount-cell">Invoice Amount</th><th>Currency</th><th>Payment Terms</th><th>Payment Method</th></tr></thead><tbody>${body}</tbody><tfoot><tr><td colspan="${isPo || isOther ? 3 : 2}" class="total-label">Amount totals by currency</td><td colspan="4"><div class="currency-totals">${totalCells}</div></td></tr></tfoot></table></div>`
  }

  if (!Array.isArray(payload.expenseRows) || payload.expenseRows.length === 0) return ""

  const rows = payload.expenseRows as Array<Record<string, any>>
  const totals = financeExpenseTotals(payload, rows)

  if (module === "finance_reimbursement") {
    const hasPo = payload.poOption === "has_po"
    const body = rows.map((row) => `
      <tr>
        ${hasPo ? `<td>${escapePrintHtml(row.po || "—")}</td>` : ""}
        <td>${escapePrintHtml(row.description || "—")}</td>
        <td>${escapePrintHtml(row.costCenter || "—")}</td>
        <td class="amount-cell">${printAmount(row.invoiceAmount ?? row.amount)}</td>
        <td>${escapePrintHtml(row.invoiceCurrency ?? row.currency ?? "—")}</td>
        <td class="amount-cell">${printAmount(row.refundAmount ?? row.amount)}</td>
        <td>${escapePrintHtml(row.refundCurrency ?? row.currency ?? "—")}</td>
      </tr>
    `).join("")
    const totalsText = FINANCE_TABLE_CURRENCIES
      .map((currency) => `<span><strong>Refund ${currency}:</strong> ${printAmount(totals[currency])}</span>`)
      .join("")

    return `
      <div class="section expense-section">
        <div class="section-title">Expense Details</div>
        <table class="expense-table">
          <thead><tr>${hasPo ? "<th>PO</th>" : ""}<th>Description</th><th>Cost Center</th><th class="amount-cell">Invoice Amount</th><th>Invoice Currency</th><th class="amount-cell">Refund Amount</th><th>Refund Currency</th></tr></thead>
          <tbody>${body}</tbody>
          <tfoot><tr><td colspan="${hasPo ? 3 : 2}" class="total-label">Refund total by currency</td><td colspan="4"><div class="currency-totals">${totalsText}</div></td></tr></tfoot>
        </table>
      </div>
    `
  }

  if (module === "finance_travel_reimbursement") {
    const body = rows.map((row) => {
      const description = row.description === "Others" ? row.otherDescription || "Others" : row.description || "—"
      const legacyCurrency = Number(row.usdAmount ?? 0) > 0 ? "USD" : Number(row.eurAmount ?? 0) > 0 ? "EUR" : "EGP"
      const legacyAmount = row[`${legacyCurrency.toLowerCase()}Amount`]
      return `
        <tr>
          <td>${escapePrintHtml(description)}</td>
          <td class="amount-cell">${printAmount(row.invoiceAmount ?? legacyAmount)}</td>
          <td>${escapePrintHtml(row.invoiceCurrency || legacyCurrency)}</td>
          <td class="amount-cell">${printAmount(row.refundAmount ?? legacyAmount)}</td>
          <td class="center-cell">${escapePrintHtml(row.refundCurrency || legacyCurrency)}</td>
        </tr>
      `
    }).join("")

    return `
      <div class="section expense-section">
        <div class="section-title">Expense Details</div>
        <table class="expense-table">
          <thead><tr><th>Description</th><th class="amount-cell">Invoice Amount</th><th>Invoice Currency</th><th class="amount-cell">Refund Amount</th><th class="center-cell">Refund Currency</th></tr></thead>
          <tbody>${body}</tbody>
          <tfoot><tr><td class="total-label">Refund total by currency</td><td colspan="4"><div class="currency-totals">${FINANCE_TABLE_CURRENCIES.map((currency) => `<span><strong>${currency}:</strong> ${printAmount(totals[currency])}</span>`).join("")}</div></td></tr></tfoot>
        </table>
      </div>
    `
  }

  return ""
}

function isPrintAttachmentField(key: string): boolean {
  if (key === "attachments" || key === "additionalAttachments") return true
  if (key.toLowerCase().includes("attachment")) return true
  return ["supportingDocument", "creditCardStatement", "reimbursementForm", "invoiceFile", "travelRequestForm", "passport", "amanSticker", "visaDocument", "flightPhoto", "hotelPhoto"].includes(key)
}

function buildPrintAttachments(
  attachments: Array<Record<string, any>>,
  requestId: string,
  origin: string,
): string {
  if (!Array.isArray(attachments) || attachments.length === 0) return ""

  const seen = new Set<string>()
  const unique = attachments.filter((attachment) => {
    const key = String(attachment.id || attachment.url || attachment.name || "")
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
  if (unique.length === 0) return ""

  const rows = unique.map((attachment) => {
    const name = attachment.name || attachment.fileName || "Attachment"
    const category = attachment.category || attachment._fieldLabel
    const size = Number(attachment.sizeBytes)
    const sizeLabel = Number.isFinite(size) && size > 0 ? `${(size / 1024).toFixed(1)} KB` : ""
    const sourceLabel = attachment.source === "comment"
      ? `Comment by ${attachment.commentAuthor || "Unknown"}`
      : category ? humanizeKey(String(category)) : "Request attachment"
    const isBlobUrl = String(attachment.url || "").startsWith("blob:")

    let href = ""
    if (!isBlobUrl && attachment.id) {
      href = `${origin}/api/requests/${encodeURIComponent(requestId)}/attachments/${encodeURIComponent(String(attachment.id))}`
    } else if (!isBlobUrl && typeof attachment.url === "string" && !attachment.url.startsWith("data:")) {
      try {
        href = new URL(attachment.url, origin).href
      } catch {
        href = ""
      }
    }

    return `
      <li class="attachment-item">
        <div class="attachment-name">
          ${href
            ? `<a href="${escapePrintHtml(href)}" target="_blank" rel="noopener noreferrer">${escapePrintHtml(name)}</a>`
            : `<span>${escapePrintHtml(name)}</span>`}
        </div>
        <div class="attachment-meta">${escapePrintHtml(sourceLabel)}${sizeLabel ? ` · ${escapePrintHtml(sizeLabel)}` : ""}${isBlobUrl ? " · Legacy file link unavailable" : ""}</div>
      </li>
    `
  }).join("")

  return `
    <div class="section attachment-section">
      <div class="section-title">Attachments</div>
      <ul class="attachment-list">${rows}</ul>
    </div>
  `
}

function attachmentDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

async function buildPrintAttachmentViews(
  attachments: Array<Record<string, any>>,
  requestId: string,
  origin: string,
): Promise<string> {
  if (!Array.isArray(attachments) || attachments.length === 0) return ""

  const seen = new Set<string>()
  const unique = attachments.filter((attachment) => {
    const key = String(attachment.id || attachment.url || attachment.name || "")
    if (!key || seen.has(key)) return false
    seen.add(key)
    return !String(attachment.url || "").startsWith("blob:")
  })

  const pages = await Promise.all(unique.map(async (attachment) => {
    const name = attachment.name || attachment.fileName || "Attachment"
    const title = attachment.category || attachment._fieldLabel
      ? humanizeKey(String(attachment.category || attachment._fieldLabel))
      : "Attachment"
    const viewUrl = attachment.id
      ? `${origin}/api/requests/${encodeURIComponent(requestId)}/attachments/${encodeURIComponent(String(attachment.id))}`
      : typeof attachment.url === "string" && !attachment.url.startsWith("data:")
        ? new URL(attachment.url, origin).href
        : ""

    if (!viewUrl) return ""

    try {
      const response = await fetch(viewUrl, { credentials: "include" })
      if (!response.ok) throw new Error(`Attachment unavailable (${response.status})`)
      const blob = await response.blob()
      const mimeType = blob.type || attachment.mimeType || ""
      const heading = `
        <div class="attachment-view-heading">
          <div class="section-title">${escapePrintHtml(title)}</div>
          <div class="attachment-view-name">${escapePrintHtml(name)}</div>
        </div>
      `

      if (mimeType.startsWith("image/")) {
        const dataUrl = await attachmentDataUrl(blob)
        return `<section class="attachment-print-page">${heading}<img class="attachment-image" src="${escapePrintHtml(dataUrl)}" alt="${escapePrintHtml(name)}" /></section>`
      }

      if (mimeType === "application/pdf") {
        return `<section class="attachment-print-page">${heading}<object class="attachment-pdf" data="${escapePrintHtml(viewUrl)}" type="application/pdf"><a href="${escapePrintHtml(viewUrl)}" target="_blank" rel="noopener noreferrer">Open ${escapePrintHtml(name)}</a></object></section>`
      }

      return `<section class="attachment-print-page">${heading}<p class="attachment-unavailable">This file type cannot be previewed in the print document. <a href="${escapePrintHtml(viewUrl)}" target="_blank" rel="noopener noreferrer">Open attachment</a></p></section>`
    } catch {
      return `<section class="attachment-print-page"><div class="attachment-view-heading"><div class="section-title">${escapePrintHtml(title)}</div><div class="attachment-view-name">${escapePrintHtml(name)}</div></div><p class="attachment-unavailable">Attachment preview is unavailable. <a href="${escapePrintHtml(viewUrl)}" target="_blank" rel="noopener noreferrer">Open attachment</a></p></section>`
    }
  }))

  return pages.filter(Boolean).join("")
}

export default function RequestDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const searchParams = useSearchParams()
  const backHref = searchParams.get("source") === "departments/hr/general" ? "/departments/hr/general" : "/requests"
  const backLabel = backHref === "/departments/hr/general" ? "Back to HR General Requests" : "Back to Requests"
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
  const canEditRequest = session?.user?.permissions && (hasPermission(session.user.permissions, "edit_request") || hasPermission(session.user.permissions, "update"))
  const canManageCc = session?.user?.permissions ? hasPermission(session.user.permissions, "manage_cc") : false
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
      if ((MANAGER_APPROVAL_MODULES as readonly string[]).includes(request.module) && newStatus === "awaiting_approval" && oldStatus !== newStatus) {
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
        requestOwnerId: request.requesterId || "USR-001",
        requestOwnerEmail: request.requesterEmail,
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
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ resend: true }) }
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

  const handlePrint = async (includeAttachments = false) => {
    if (!request) return

    const printWindow = window.open("", "_blank")
    if (!printWindow) return

    const moduleLabel = humanizeKey(request.module)
    const statusLabel = getStatusLabel(request.status, request.module)

    const requesterInfo = request.requester
      ? `${request.requester.name} (${request.requester.email})`
      : "Not specified"

    const assigneeInfo = request.assignedToName
      ? `${request.assignedToName}${request.assignedToEmail ? ` (${request.assignedToEmail})` : ""}`
      : "Unassigned"

    const ccList = request.ccEmails && request.ccEmails.length > 0
      ? request.ccEmails.join(", ")
      : "None"

    const adminCcList = request.adminCc && request.adminCc.length > 0
      ? request.adminCc.join(", ")
      : "None"

    const expenseTableHtml = buildFinanceExpensePrintTable(request.module, request.payload || {})
    // Standard Print keeps a compact attachment-name list. In Print with
    // Attachments, each document is rendered on its own following page, so
    // do not duplicate the names on the request's first page.
    const attachmentsHtml = includeAttachments ? "" : buildPrintAttachments(request.attachments || [], request.id, window.location.origin)
    const attachmentViewsHtml = includeAttachments
      ? await buildPrintAttachmentViews(request.attachments || [], request.id, window.location.origin)
      : ""

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${request.title} - ${request.id}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          html, body { height: 100%; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1f2937; line-height: 1.5; }
          .container { max-width: 900px; margin: 0 auto; padding: 30px 20px; display: flex; flex-direction: column; min-height: 100%; }
          .logo-section { text-align: center; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px solid #e5e7eb; }
          .logo-section img { height: 40px; width: auto; }
          .header { border-bottom: 3px solid #2563eb; margin-bottom: 20px; padding-bottom: 15px; }
          .header h1 { font-size: 24px; margin-bottom: 6px; }
          .header .meta { display: flex; gap: 20px; flex-wrap: wrap; font-size: 13px; color: #6b7280; }
          .badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; }
          .badge.new { background-color: #dbeafe; color: #0c4a6e; }
          .badge.in_progress { background-color: #bfdbfe; color: #1e40af; }
          .badge.completed { background-color: #d1fae5; color: #065f46; }
          .badge.cancelled { background-color: #fee2e2; color: #7f1d1d; }
          .badge.delivered { background-color: #dcfce7; color: #166534; }
          .badge.awaiting_approval { background-color: #fed7aa; color: #92400e; }
          .content { flex: 1; }
          .section { margin-bottom: 18px; page-break-inside: avoid; }
          .section-title { font-size: 12px; font-weight: 700; color: #374151; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px; }
          .details-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; }
          .detail-item { page-break-inside: avoid; }
          .detail-label { font-size: 11px; color: #6b7280; text-transform: uppercase; font-weight: 600; margin-bottom: 3px; }
          .detail-value { font-size: 13px; color: #1f2937; font-weight: 500; white-space: pre-wrap; overflow-wrap: anywhere; }
          .description-box { background-color: #f9fafb; padding: 12px; border-radius: 6px; border-left: 3px solid #2563eb; font-size: 13px; white-space: pre-wrap; overflow-wrap: anywhere; }
          .expense-section { page-break-inside: auto; }
          .expense-table { width: 100%; border-collapse: collapse; table-layout: auto; font-size: 12px; }
          .expense-table th { background: #f3f4f6; color: #374151; font-size: 10px; text-transform: uppercase; letter-spacing: 0.35px; text-align: left; }
          .expense-table th, .expense-table td { border: 1px solid #d1d5db; padding: 7px 8px; vertical-align: top; overflow-wrap: anywhere; }
          .expense-table tbody tr:nth-child(even) { background: #f9fafb; }
          .expense-table tfoot td { background: #fffbeb; color: #111827; font-weight: 700; }
          .expense-table .amount-cell { text-align: right; white-space: nowrap; }
          .expense-table .center-cell { text-align: center; }
          .expense-table .total-label { text-align: right; }
          .currency-totals { display: flex; flex-wrap: wrap; gap: 4px 16px; color: #111827; font-weight: 700; }
          .attachment-list { list-style: none; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
          .attachment-item { border: 1px solid #dbe3ef; border-radius: 6px; background: #f8fafc; padding: 9px 10px; page-break-inside: avoid; }
          .attachment-name { font-size: 12px; font-weight: 600; overflow-wrap: anywhere; }
          .attachment-name a { color: #1d4ed8; text-decoration: underline; text-underline-offset: 2px; }
          .attachment-meta { margin-top: 3px; color: #6b7280; font-size: 10px; overflow-wrap: anywhere; }
          .attachment-print-page { break-before: page; page-break-before: always; }
          .attachment-view-heading { border-bottom: 2px solid #2563eb; margin-bottom: 14px; padding-bottom: 8px; }
          .attachment-view-heading .section-title { margin-bottom: 3px; }
          .attachment-view-name { color: #1e3a8a; font-size: 14px; font-weight: 700; overflow-wrap: anywhere; }
          .attachment-image { display: block; width: 100%; max-height: 900px; object-fit: contain; object-position: top left; border: 1px solid #d1d5db; }
          .attachment-pdf { display: block; width: 100%; height: 900px; border: 1px solid #d1d5db; }
          .attachment-unavailable { border: 1px solid #fbbf24; background: #fffbeb; color: #78350f; border-radius: 6px; padding: 12px; font-size: 12px; }
          .attachment-unavailable a { color: #1d4ed8; font-weight: 600; }
          .print-date { text-align: center; margin-top: auto; padding-top: 15px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #9ca3af; }
          @media print {
            html, body { margin: 0; padding: 0; }
            body { background: white; }
            .container { padding: 15px; margin: 0; }
            .section { page-break-inside: avoid; }
            .detail-item { page-break-inside: avoid; }
            .expense-section { page-break-inside: auto; }
            .expense-table thead { display: table-header-group; }
            .expense-table tfoot { display: table-footer-group; }
            .expense-table tr { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo-section">
            <img src="/siware-logo.png" alt="Si-Ware Systems" style="max-height: 50px;">
          </div>

          <div class="header">
            <h1>${request.title}</h1>
            <div class="meta">
              <div><strong>Request ID:</strong> ${request.id}</div>
              <div><strong>Module:</strong> ${moduleLabel}</div>
              <div><strong>Status:</strong> <span class="badge ${request.status}">${statusLabel}</span></div>
            </div>
          </div>

          <div class="content">
          <div class="section">
            <div class="section-title">Request Information</div>
            <div class="details-grid">
              <div class="detail-item">
                <div class="detail-label">Requester</div>
                <div class="detail-value">${requesterInfo}</div>
              </div>
              <div class="detail-item">
                <div class="detail-label">Created</div>
                <div class="detail-value">${fmtDateTime(request.createdAt)}</div>
              </div>
              <div class="detail-item">
                <div class="detail-label">Last Updated</div>
                <div class="detail-value">${fmtDateTime(request.updatedAt)}</div>
              </div>
              <div class="detail-item">
                <div class="detail-label">Assigned To</div>
                <div class="detail-value">${assigneeInfo}</div>
              </div>
              <div class="detail-item">
                <div class="detail-label">CC Recipients</div>
                <div class="detail-value">${ccList}</div>
              </div>
              <div class="detail-item">
                <div class="detail-label">Admin CC</div>
                <div class="detail-value">${adminCcList}</div>
              </div>
            </div>
          </div>

          ${request.description ? `
            <div class="section">
              <div class="section-title">Description</div>
              <div class="description-box">${request.description.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
            </div>
          ` : ""}

          ${Object.keys(request.payload || {}).length > 0 ? `
            <div class="section">
              <div class="section-title">Request Details</div>
              <div class="details-grid">
                ${Object.entries(request.payload || {})
                  .filter(([key]) => !["ccEmails", "adminCc", "expenseRows", "totalsByCurrency"].includes(key) && !isPrintAttachmentField(key) && !(request.module === "finance_invoice_payment" && ["supplier", "poOrContract", "poNumbers", "otherDetails", "amount", "currency", "paymentTerms", "paymentMethod", "invoiceRows"].includes(key)))
                  .map(([key, value]) => {
                    if (value === null || value === undefined || value === "") return ""
                    const label = humanizeKey(key)
                    const displayValue = typeof value === "boolean"
                      ? value ? "Yes" : "No"
                      : Array.isArray(value)
                      ? value.join(", ")
                      : value && typeof value === "object"
                        ? JSON.stringify(value, null, 2)
                        : String(value)
                    const escapedDisplayValue = displayValue
                      .replace(/&/g, "&amp;")
                      .replace(/</g, "&lt;")
                      .replace(/>/g, "&gt;")
                    return `
                      <div class="detail-item">
                        <div class="detail-label">${label}</div>
                        <div class="detail-value">${escapedDisplayValue}</div>
                      </div>
                    `
                  })
                  .join("")}
              </div>
            </div>
          ` : ""}
          ${expenseTableHtml}
          ${attachmentsHtml}
          ${attachmentViewsHtml}
          </div>

          <div class="print-date">
            Printed on ${new Date().toLocaleString()}
          </div>
        </div>
      </body>
      </html>
    `

    printWindow.document.write(html)
    printWindow.document.close()

    setTimeout(() => {
      printWindow.print()
    }, 250)
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
      hr_general:  ['new', 'in_progress', 'completed', 'cancelled'],
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
          } else if (response.status === 403) {
            // Never fall back to localStorage for an explicitly denied
            // request: old browser cache must not bypass server access rules.
            setError("Access restricted — you do not have permission to view this request or its confidential details.")
            return
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

        // A Travel request can automatically create a People Team travel-letter
        // request. Surface that relationship in the source request's timeline
        // so the Admin Team can confirm the hand-off without opening another
        // queue or inspecting its raw payload.
        const linkedHrLetterId = engineRequest.module === "travel"
          ? (engineRequest.payload as any)?.linkedHrLetterRequestId as string | undefined
          : undefined
        const linkedHrLetter = linkedHrLetterId
          ? getRequests().find((item) => item.id === linkedHrLetterId)
          : undefined
        const hrLetterHistoryEntry = linkedHrLetterId ? [{
          id: `${engineRequest.id}-hr-letter-${linkedHrLetterId}`,
          action: "hr_travel_letter_created",
          newValue: {
            id: linkedHrLetterId,
            title: linkedHrLetter?.title ?? "HR Travel Letter",
            status: linkedHrLetter?.status ?? "new",
          },
          changedByUserId: "System",
          changedByUser: { id: "System", name: "System", email: "" },
          createdAt: linkedHrLetter?.createdAt ?? engineRequest.updatedAt,
        }] : []

        // Combine and sort all history by date
        const allHistory = [...statusHistoryEntries, ...commentHistoryEntries, ...hrLetterHistoryEntry]
          .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

        let foundRequest: RequestDetail = {
          id: engineRequest.id,
          title: engineRequest.title,
          description: (engineRequest.payload?.description as string | undefined) || undefined,
          module: engineRequest.module,
          status: engineRequest.status,
          payload: engineRequest.payload || {},
          requesterId: engineRequest.requesterId,
          requesterEmail: engineRequest.requesterEmail,
          requesterName: engineRequest.requesterName,
          companyId: engineRequest.companyId,
          companyName: engineRequest.companyName,
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

        // Fetch server-stored attachments (disk-based, not in payload)
        try {
          const serverAttsRes = await fetch(`/api/requests/${id}/attachments`)
          if (serverAttsRes.ok) {
            const serverAttsData = await serverAttsRes.json()
            const serverAtts = (serverAttsData.data ?? []) as any[]
            // Merge: server attachments take priority; deduplicate by id
            const existingIds = new Set((foundRequest.attachments || []).map((a: any) => a.id))
            const newServerAtts = serverAtts.filter((a: any) => !existingIds.has(a.id))
            foundRequest = {
              ...foundRequest,
              attachments: [
                ...(foundRequest.attachments || []),
                ...newServerAtts,
              ],
            }
          }
        } catch {
          // Server attachments are a best-effort enhancement
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
          href={backHref}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {backLabel}
        </Link>
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center gap-3 text-center">
              <AlertCircle className="h-8 w-8 text-red-500" />
              <p className="font-medium text-red-700">{error || "Request not found"}</p>
              <Button onClick={() => router.push(backHref)} variant="outline" className="mt-4">
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
        href={backHref}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        {backLabel}
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
                    {request.module === "hr_general" ? "HR General Request" : request.module}
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

                  {/* Print and Edit Buttons */}
                  <div className="ml-auto flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => handlePrint()}
                      title="Print request summary"
                      className="gap-2"
                    >
                      <Printer className="h-4 w-4" />
                      Print
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handlePrint(true)}
                      title="Print request with attachment previews"
                      className="gap-2"
                      disabled={!request.attachments?.length}
                    >
                      <Printer className="h-4 w-4" />
                      Print with Attachments
                    </Button>
                    {canEditRequest && (
                      <Button
                        variant="outline"
                        onClick={() => window.open(`/${request.module}/new?id=${request.id}`, '_blank')}
                      >
                        Edit
                      </Button>
                    )}
                  </div>
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

            {(MANAGER_APPROVAL_MODULES as readonly string[]).includes(request.module) && request.status === "awaiting_approval" && (
              <div className="flex flex-col gap-2 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-amber-800">{["travel", "finance_travel_reimbursement"].includes(request.module) ? "Authorized Manager" : "Direct Manager"} approval is required</p>
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

                {request.companyName && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium">Company Name</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Badge className={request.companyId === "buchi" ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"}>
                        {request.companyName}
                      </Badge>
                    </CardContent>
                  </Card>
                )}

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
                      module={request.module}
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
                  <CardHeader className="border-b bg-slate-50/70 py-4">
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Request Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-5">
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      {Object.entries(request.payload)
                        // ccEmails has its own panel; attachments has its own tab.
                        // Skip empty values so the grid doesn't show 20 blank rows.
                        .filter(([key, value]) => {
                          // Skip ccEmails and all attachment-related fields
                          if (["ccEmails", "attachments", "expenseRows", "amount", "priority", "totalsByCurrency", "refundTotalsByCurrency"].includes(key)) return false
                          if (request.module === "finance_invoice_payment" && ["supplier", "poOrContract", "currency", "paymentTerms", "paymentMethod", "poNumbers", "invoiceRows"].includes(key)) return false
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
                    <FinanceExpenseDetailsTable module={request.module} payload={request.payload as Record<string, unknown>} />
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
                      {item.action === 'hr_travel_letter_created' && (
                        <p className="text-xs text-gray-600 mt-1">
                          A linked HR Travel Letter was created: {" "}
                          <Link
                            href={`/departments/hr/requests/${String(item.newValue?.id)}`}
                            className="font-medium text-blue-700 underline underline-offset-2 hover:text-blue-900"
                          >
                            {String(item.newValue?.id)}
                          </Link>
                          {item.newValue?.status && (
                            <span> (status: {getStatusLabel(String(item.newValue.status))})</span>
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
                    requestOwnerId: request.requesterId || "USR-001",
                    requestOwnerEmail: request.requesterEmail,
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
          {activeTab === "attachments" && (() => {
            const CATEGORY_LABELS: Record<string, string> = {
              // Shipping
              invoice: "Commercial Invoice",
              awb: "AWB",
              other: "Other",
              // Travel named fields
              amanSticker: "Aman Sticker",
              passport: "Passport",
              hotelPhoto: "Hotel Photo",
              flightPhoto: "Flight Photo / Booking",
              travelRequestForm: "Travel Request Form",
              visaDocument: "Visa Document",
              additionalAttachments: "Additional",
              // Finance named fields
              supportingDocument: "Supporting Document",
              creditCardStatement: "Payment Evidence — Company Expense Only",
              reimbursementForm: "Reimbursement Form",
              invoiceFile: "Invoice File",
            }
            return (
            <div className="space-y-2">
              {request.attachments && request.attachments.length > 0 ? (
                request.attachments.map((attachment: any) => {
                  const categoryKey = attachment.category ?? attachment._fieldLabel
                  const categoryLabel = categoryKey ? (CATEGORY_LABELS[categoryKey] ?? categoryKey) : null
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
                  // Server-stored: url is /api/requests/{id}/attachments/{attId}/download
                  // or we use the proxy route for both preview and download
                  const proxyUrl = `/api/requests/${request.id}/attachments/${encodeURIComponent(attachment.id)}`
                  const previewUrl = proxyUrl
                  const downloadUrl = isDataUrl
                    ? attachment.url  // data: URL downloads directly
                    : `/api/requests/${request.id}/attachments/${encodeURIComponent(attachment.id)}/download`
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
                            {attachment.sizeBytes ? `${(attachment.sizeBytes / 1024).toFixed(1)} KB` : ""}
                          </p>
                          {categoryLabel && (
                            <span className="text-xs bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded font-medium">
                              {categoryLabel}
                            </span>
                          )}
                          {attachment.source === 'comment' && (
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                              From comment by {attachment.commentAuthor}
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
                          href={downloadUrl}
                          download={attachment.name}
                          className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-3 py-1.5 rounded transition-colors"
                          title="Download"
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
            )
          })()}
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

  // Travel + Finance named fields
  const namedFields = [
    "amanSticker", "passport", "hotelPhoto", "flightPhoto",
    "supportingDocument", "creditCardStatement", "reimbursementForm", "invoiceFile",
  ]
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

function isPayloadAttachmentField(fieldKey: string): boolean {
  return ["supportingDocument", "creditCardStatement", "reimbursementForm", "invoiceFile", "travelRequestForm", "passport", "amanSticker", "visaDocument", "flightPhoto", "hotelPhoto", "additionalAttachments"].includes(fieldKey)
    || fieldKey.toLowerCase().includes("attachment")
}

function attachmentFileNames(value: unknown): string[] {
  const items = Array.isArray(value) ? value : [value]
  return items
    .map((item) => {
      if (item && typeof item === "object") {
        const file = item as Record<string, unknown>
        return String(file.name ?? file.fileName ?? "")
      }
      return typeof item === "string" ? item : ""
    })
    .filter(Boolean)
}

function FinanceExpenseDetailsTable({ module, payload }: { module: string; payload: Record<string, unknown> }) {
  if (module === "finance_invoice_payment") {
    const rows = Array.isArray(payload.invoiceRows) && payload.invoiceRows.length > 0
      ? payload.invoiceRows as Array<Record<string, unknown>>
      : [{ supplier: payload.supplier, poNumber: Array.isArray(payload.poNumbers) ? payload.poNumbers.join(", ") : "", otherDescription: payload.otherDetails, amount: payload.amount, currency: payload.currency, paymentTerms: payload.paymentTerms, paymentMethod: payload.paymentMethod }]
    const totals = rows.reduce<Record<string, number>>((result, row) => {
      const currency = String(row.currency ?? "USD")
      result[currency] = (result[currency] ?? 0) + (Number.isFinite(Number(row.amount)) ? Number(row.amount) : 0)
      return result
    }, {})
    const leadingColumns = payload.poOrContract === "contract" ? 2 : 3
    return (
      <div className="mt-5 overflow-hidden rounded-lg border border-slate-200">
        <div className="border-b bg-slate-50 px-4 py-3"><h3 className="text-sm font-semibold text-slate-800">Invoice Details</h3></div>
        <table className="w-full table-fixed text-left text-xs">
          <thead className="bg-slate-50 text-[10px] font-semibold uppercase tracking-wide text-slate-600"><tr><th className="px-3 py-3">Supplier</th>{payload.poOrContract === "po" && <th className="px-3 py-3">PO Number</th>}{payload.poOrContract === "other" && <th className="px-3 py-3">Description</th>}<th className="px-3 py-3 text-right">Invoice Amount</th><th className="px-3 py-3">Currency</th><th className="px-3 py-3">Payment Terms</th><th className="px-3 py-3">Payment Method</th></tr></thead>
          <tbody>{rows.map((row, index) => <tr key={index} className="border-t text-slate-700"><td className="break-words px-3 py-3">{String(row.supplier ?? "—")}</td>{payload.poOrContract === "po" && <td className="break-words px-3 py-3">{String(row.poNumber ?? "—")}</td>}{payload.poOrContract === "other" && <td className="break-words px-3 py-3">{String(row.otherDescription ?? "—")}</td>}<td className="px-3 py-3 text-right font-bold tabular-nums text-slate-950">{printAmount(row.amount)}</td><td className="px-3 py-3">{String(row.currency ?? "—")}</td><td className="break-words px-3 py-3">{String(row.paymentTerms ?? "—")}</td><td className="break-words px-3 py-3">{String(row.paymentMethod ?? "—")}</td></tr>)}</tbody>
          <tfoot><tr className="border-t bg-amber-50/70 font-bold text-slate-950"><td colSpan={leadingColumns} className="px-3 py-3 text-right">Amount totals by currency</td><td colSpan={4} className="px-3 py-3"><div className="flex flex-wrap justify-between gap-x-4 gap-y-1">{Object.entries(totals).map(([currency, amount]) => <span key={currency}>{currency}: {printAmount(amount)}</span>)}</div></td></tr></tfoot>
        </table>
      </div>
    )
  }

  if ((module !== "finance_reimbursement" && module !== "finance_travel_reimbursement") || !Array.isArray(payload.expenseRows) || payload.expenseRows.length === 0) return null

  const rows = payload.expenseRows as Array<Record<string, any>>
  const totals = financeExpenseTotals(payload, rows)
  const isReimbursement = module === "finance_reimbursement"
  const hasPo = payload.poOption === "has_po"
  const currencies = FINANCE_TABLE_CURRENCIES

  const legacyCurrency = (row: Record<string, any>) => Number(row.usdAmount ?? 0) > 0 ? "USD" : Number(row.eurAmount ?? 0) > 0 ? "EUR" : "EGP"
  const legacyAmount = (row: Record<string, any>) => Number(row[`${legacyCurrency(row).toLowerCase()}Amount`] ?? 0)

  return (
    <div className="mt-5 overflow-hidden rounded-lg border border-slate-200">
      <div className="border-b bg-slate-50 px-4 py-3">
        <h3 className="text-sm font-semibold text-slate-800">Expense Details</h3>
      </div>
      <table className="w-full table-fixed text-left text-xs">
        <thead className="bg-slate-50 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
          <tr>
            {isReimbursement && hasPo && <th className="w-[10%] px-2 py-3">PO</th>}
            <th className={isReimbursement ? "w-[22%] px-2 py-3" : "w-[30%] px-2 py-3"}>Description</th>
            {isReimbursement && <th className="w-[15%] px-2 py-3">Cost Center</th>}
            <th className="w-[14%] px-2 py-3 text-right">Invoice Amount</th>
            <th className="w-[13%] px-2 py-3">Invoice Currency</th>
            <th className="w-[14%] px-2 py-3 text-right">Refund Amount</th>
            <th className="w-[12%] px-2 py-3">Refund Currency</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row, index) => {
            const description = row.description === "Others" ? row.otherDescription || "Others" : row.description || "—"
            const fallbackCurrency = legacyCurrency(row)
            const fallbackAmount = legacyAmount(row)
            return (
              <tr key={index} className="text-slate-700">
                {isReimbursement && hasPo && <td className="px-2 py-3">{row.po || "—"}</td>}
                <td className="break-words px-2 py-3 font-medium">{description}</td>
                {isReimbursement && <td className="break-words px-2 py-3">{row.costCenter || "—"}</td>}
                <td className="px-2 py-3 text-right tabular-nums">{printAmount(row.invoiceAmount ?? row.amount ?? fallbackAmount)}</td>
                <td className="px-2 py-3">{row.invoiceCurrency ?? row.currency ?? fallbackCurrency}</td>
                <td className="px-2 py-3 text-right tabular-nums">{printAmount(row.refundAmount ?? row.amount ?? fallbackAmount)}</td>
                <td className="px-2 py-3">{row.refundCurrency ?? row.currency ?? fallbackCurrency}</td>
              </tr>
            )
          })}
        </tbody>
        <tfoot className="border-t bg-amber-50/70 font-bold text-slate-950">
          <tr>
            <td className="px-3 py-3 text-right text-xs font-semibold" colSpan={isReimbursement ? (hasPo ? 3 : 2) : 1}>Refund totals</td>
            <td className="px-3 py-3" colSpan={isReimbursement ? 4 : 4}>
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold">
                {currencies.map((currency) => <span key={currency}>{currency}: {printAmount(totals[currency])}</span>)}
              </div>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

function PayloadField({ fieldKey, value }: { fieldKey: string; value: unknown }) {
  const label = fieldKey === "poOption" ? "Has Purchase Order" : humanizeKey(fieldKey)
  return (
    <div className="min-w-0 rounded-lg border border-slate-100 bg-slate-50/50 px-3.5 py-3">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
        {label}
      </p>
      <div className="mt-1"><PayloadValue fieldKey={fieldKey} value={value} /></div>
    </div>
  )
}

function PayloadValue({ fieldKey, value }: { fieldKey: string; value: unknown }) {
  // Skip attachments — they have their own dedicated tab
  if (fieldKey === "attachments") {
    return <p className="text-sm text-gray-500 italic">See Attachments tab</p>
  }

  // Named upload fields are persisted as attachment metadata objects. The
  // details card should identify the document without exposing its internal
  // storage URL, checksum, upload data, or other technical fields.
  if (isPayloadAttachmentField(fieldKey)) {
    const names = attachmentFileNames(value)
    return names.length > 0
      ? <p className="text-sm font-medium text-blue-700 break-words">{names.join(", ")}</p>
      : <p className="text-sm text-gray-500 italic">No file attached</p>
  }

  if (fieldKey === "poOption") {
    return <p className="text-sm font-medium text-gray-900">{value === "has_po" ? "Yes" : "No"}</p>
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
      return <p className="text-sm font-medium text-gray-900 whitespace-pre-wrap break-words">{value.join(", ")}</p>
    }
    // Array of objects — try to find a readable label (name → title → id).
    return (
      <ul className="text-sm space-y-1">
        {value.map((item, idx) => {
          if (item && typeof item === "object") {
            const obj = item as Record<string, unknown>
            const label = (obj.name ?? obj.title ?? obj.label ?? obj.id ?? "Item") as string
            return <li key={idx} className="font-medium text-gray-900 whitespace-pre-wrap break-words">{String(label)}</li>
          }
          return <li key={idx} className="font-medium text-gray-900 whitespace-pre-wrap break-words">{String(item)}</li>
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
            <span className="font-medium text-gray-900 whitespace-pre-wrap break-words">
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
  return <p className="text-sm font-medium text-gray-900 whitespace-pre-wrap break-words">{text}</p>
}
