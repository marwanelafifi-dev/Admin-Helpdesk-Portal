"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Calendar, User, FileText, Clock, CheckCircle2, AlertCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { requestsAPI } from "@/lib/apiClient"
import { cn } from "@/lib/utils"

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-zinc-100 text-zinc-600",
  new: "bg-sky-100 text-sky-700",
  on_hold: "bg-amber-100 text-amber-700",
  in_transit: "bg-blue-100 text-blue-700",
  in_customs: "bg-amber-100 text-amber-700",
  delivered: "bg-green-100 text-green-700",
  completed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-100 text-red-600",
}

const STATUS_DOT: Record<string, string> = {
  draft: "bg-zinc-400",
  new: "bg-sky-500",
  on_hold: "bg-amber-500",
  in_transit: "bg-blue-500",
  in_customs: "bg-amber-500",
  delivered: "bg-green-500",
  completed: "bg-emerald-500",
  cancelled: "bg-red-500",
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

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
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

export default function RequestDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [request, setRequest] = useState<RequestDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchRequest = async () => {
      try {
        setLoading(true)
        // Try to fetch from all modules until we find it
        const modules = ["shipping", "hr", "maintenance", "purchase"]
        let found = false
        let foundRequest: RequestDetail | null = null

        for (const module of modules) {
          try {
            const data = await requestsAPI.getOne(module, id)
            foundRequest = data as RequestDetail
            found = true
            break
          } catch (err) {
            // Continue to next module
          }
        }

        if (!found) {
          setError("Request not found")
        } else {
          setRequest(foundRequest)
        }
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
                  <Badge className={`${STATUS_COLORS[request.status] || "bg-gray-100"}`}>
                    <span className={`inline-block h-2 w-2 rounded-full mr-1.5 ${STATUS_DOT[request.status] || "bg-gray-400"}`} />
                    {request.status === "new" ? "New" : request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                  </Badge>
                </div>
                <h1 className="text-3xl font-bold tracking-tight">{request.title}</h1>
                <p className="text-sm text-muted-foreground mt-1">Request ID: {request.id}</p>
              </div>
            </div>

            {request.description && (
              <div className="pt-4 border-t">
                <p className="text-sm text-gray-600">{request.description}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Details Grid */}
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
            <p className="text-sm">{formatDate(request.createdAt)}</p>
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
            <p className="text-sm">{formatDate(request.updatedAt)}</p>
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
              {Object.entries(request.payload).map(([key, value]) => (
                <div key={key} className="space-y-1">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    {key.replace(/([A-Z])/g, " $1").trim()}
                  </p>
                  <p className="text-sm font-medium text-gray-900">
                    {typeof value === "object" ? JSON.stringify(value) : String(value)}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Audit Trail / History */}
      {request.history && request.history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Activity Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {request.history.map((item, idx) => (
                <div key={item.id} className="flex gap-4">
                  <div className="relative flex flex-col items-center">
                    <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                      <CheckCircle2 className="h-4 w-4 text-blue-600" />
                    </div>
                    {idx < request.history.length - 1 && <div className="w-0.5 h-12 bg-gray-200 my-2" />}
                  </div>
                  <div className="flex-1 pt-1">
                    <p className="text-sm font-medium capitalize">
                      {item.action.replace(/_/g, " ")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      By {item.changedByUser?.name || item.changedByUserId}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{formatDate(item.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Attachments */}
      {request.attachments && request.attachments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Attachments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {request.attachments.map((attachment) => (
                <a
                  key={attachment.id}
                  href={attachment.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <FileText className="h-4 w-4 text-blue-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{attachment.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(attachment.sizeBytes / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Comments Section */}
      {request.comments && request.comments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Comments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {request.comments.map((comment) => (
                <div key={comment.id} className="border-l-2 border-gray-200 pl-4 py-2">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm">{comment.author?.name || "Anonymous"}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(comment.createdAt)}</p>
                  </div>
                  <p className="text-sm text-gray-700 mt-2">{comment.content}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
