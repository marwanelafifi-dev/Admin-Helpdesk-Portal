'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { isReservedRequestPathId } from '@/lib/request-path-guards'
import {
  ArrowLeft, Clock, User, CheckCircle2, Circle, XCircle,
  Package, Wrench, ShoppingCart, CalendarDays, Plane, UserCog,
  MapPin, Truck, Box, AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusDropdown, type RequestStatus } from '@/components/ui/status-dropdown'
import Link from 'next/link'
import { cn } from '@/lib/utils'

// ── Types ──────────────────────────────────────────────────────────────────

interface StatusHistoryEntry {
  status: string
  changedBy: string
  changedByName?: string
  changedAt: string
  comment?: string
}

interface RequestDetail {
  id: string
  module: string
  title: string
  status: RequestStatus
  payload: Record<string, unknown>
  statusHistory: StatusHistoryEntry[]
  requester: { name: string; email: string }
  createdAt: string
  updatedAt: string
}

// ── Status config ──────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft', new: 'Submitted', on_hold: 'On Hold',
  in_transit: 'In Transit', in_customs: 'In Customs',
  delivered: 'Delivered', completed: 'Completed',
  cancelled: 'Cancelled', pending_assignment: 'Pending',
  assigned: 'Assigned', awaiting_input: 'Awaiting Input',
  resolved: 'Resolved', closed: 'Closed',
}

const STATUS_COLOR: Record<string, string> = {
  new: 'bg-sky-500', on_hold: 'bg-amber-500', in_transit: 'bg-blue-500',
  in_customs: 'bg-violet-500', delivered: 'bg-green-500',
  completed: 'bg-emerald-500', cancelled: 'bg-red-500',
  draft: 'bg-zinc-400', resolved: 'bg-teal-500', assigned: 'bg-blue-400',
  pending_assignment: 'bg-slate-400', awaiting_input: 'bg-orange-400',
}

// Module-specific tracking flows (ordered steps)
const MODULE_FLOWS: Record<string, string[]> = {
  shipping:    ['new', 'on_hold', 'in_transit', 'in_customs', 'delivered', 'completed'],
  maintenance: ['new', 'on_hold', 'assigned', 'resolved', 'completed'],
  purchase:    ['new', 'on_hold', 'awaiting_input', 'completed'],
  event:       ['new', 'on_hold', 'completed'],
  travel:      ['new', 'on_hold', 'completed'],
  hr:          ['new', 'on_hold', 'completed'],
}

const MODULE_ICON: Record<string, React.ElementType> = {
  shipping: Package, maintenance: Wrench, purchase: ShoppingCart,
  event: CalendarDays, travel: Plane, hr: UserCog,
}

const MODULE_COLOR: Record<string, string> = {
  shipping: 'text-blue-600 bg-blue-50', maintenance: 'text-purple-600 bg-purple-50',
  purchase: 'text-green-600 bg-green-50', event: 'text-orange-600 bg-orange-50',
  travel: 'text-pink-600 bg-pink-50', hr: 'text-teal-600 bg-teal-50',
}

// ── Tracking Timeline ──────────────────────────────────────────────────────

function TrackingTimeline({ request }: { request: RequestDetail }) {
  const flow = MODULE_FLOWS[request.module] ?? ['new', 'completed']
  const cancelled = request.status === 'cancelled'
  const history = request.statusHistory ?? []

  // Find timestamp from history for each step
  const stepTimestamp = (status: string): string | null => {
    // Check history in order — find the earliest occurrence of this status
    const entry = [...history].find((e) => e.status === status)
    return entry?.changedAt ?? null
  }

  // Which steps are "done" (appeared in history or are before current)
  const currentIdx = flow.indexOf(request.status)
  const isStepDone = (step: string, idx: number) => {
    if (cancelled) return false
    return idx < currentIdx || flow.indexOf(request.status) >= 0 && step === request.status
  }
  const isStepActive = (step: string) => !cancelled && step === request.status

  return (
    <Card className="border border-gray-100 shadow-sm overflow-hidden">
      <CardHeader className="pb-2 border-b border-gray-50 bg-gray-50/50">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Truck className="h-4 w-4 text-blue-500" />
            Request Tracking
          </CardTitle>
          <div className="flex items-center gap-2">
            {cancelled ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                <XCircle className="h-3 w-3" /> Cancelled
              </span>
            ) : (
              <span className={cn(
                "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold text-white",
                STATUS_COLOR[request.status] ?? "bg-gray-400"
              )}>
                <Circle className="h-2 w-2 fill-current" />
                {STATUS_LABEL[request.status] ?? request.status}
              </span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6 pb-6">
        {cancelled ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <XCircle className="h-12 w-12 text-red-400" />
            <div>
              <p className="font-semibold text-red-700">Request Cancelled</p>
              <p className="text-xs text-gray-400 mt-1">
                {history.find((e) => e.status === 'cancelled')?.changedAt
                  ? `on ${new Date(history.find((e) => e.status === 'cancelled')!.changedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`
                  : ''}
              </p>
              {history.find((e) => e.status === 'cancelled')?.comment && (
                <p className="text-xs text-gray-500 mt-1 italic">
                  "{history.find((e) => e.status === 'cancelled')!.comment}"
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="relative">
            {/* Connector line */}
            <div className="absolute top-5 left-5 right-5 h-0.5 bg-gray-200 z-0" />
            <div
              className="absolute top-5 left-5 h-0.5 bg-blue-500 z-0 transition-all duration-700"
              style={{
                width: flow.length > 1
                  ? `${(Math.max(0, currentIdx) / (flow.length - 1)) * (100 - 40 / flow.length)}%`
                  : '0%',
              }}
            />

            {/* Steps */}
            <ol className="relative flex justify-between z-10">
              {flow.map((step, idx) => {
                const done   = isStepDone(step, idx)
                const active = isStepActive(step)
                const ts     = stepTimestamp(step)

                return (
                  <li key={step} className="flex flex-col items-center flex-1 min-w-0">
                    {/* Circle */}
                    <div className={cn(
                      "h-10 w-10 rounded-full flex items-center justify-center border-2 transition-all duration-300",
                      done   ? "bg-blue-500 border-blue-500 shadow-md shadow-blue-200" :
                      active ? "bg-blue-500 border-blue-500 shadow-lg shadow-blue-300 ring-4 ring-blue-100" :
                               "bg-white border-gray-200"
                    )}>
                      {done || active ? (
                        active && !flow[flow.indexOf(step) + 1]
                          ? <CheckCircle2 className="h-5 w-5 text-white" />
                          : done && !active
                          ? <CheckCircle2 className="h-5 w-5 text-white" />
                          : <Circle className="h-3 w-3 fill-white text-white animate-pulse" />
                      ) : (
                        <span className="text-xs font-bold text-gray-400">{idx + 1}</span>
                      )}
                    </div>

                    {/* Label */}
                    <p className={cn(
                      "mt-2 text-[11px] font-semibold text-center leading-tight px-1",
                      done || active ? "text-blue-700" : "text-gray-400"
                    )}>
                      {STATUS_LABEL[step] ?? step}
                    </p>

                    {/* Timestamp */}
                    {ts ? (
                      <p className="mt-0.5 text-[10px] text-gray-400 text-center leading-tight px-1">
                        {new Date(ts).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                        <br />
                        {new Date(ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    ) : (
                      <p className="mt-0.5 text-[10px] text-gray-300 text-center">—</p>
                    )}
                  </li>
                )
              })}
            </ol>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ── Payload Display ────────────────────────────────────────────────────────

function PayloadDisplay({ payload }: { payload: Record<string, unknown> }) {
  const formatKey = (key: string) =>
    key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()).trim()

  const formatValue = (val: unknown): string => {
    if (val === null || val === undefined) return '—'
    if (typeof val === 'boolean') return val ? 'Yes' : 'No'
    if (Array.isArray(val)) return val.join(', ')
    if (typeof val === 'object') return JSON.stringify(val)
    return String(val)
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
      {Object.entries(payload).map(([key, val]) => (
        <div key={key} className="min-w-0">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{formatKey(key)}</p>
          <p className="text-sm font-medium text-gray-800 mt-0.5 break-words">{formatValue(val)}</p>
        </div>
      ))}
    </div>
  )
}

// ── History Timeline ───────────────────────────────────────────────────────

function HistoryTimeline({ history, createdAt }: { history: StatusHistoryEntry[]; createdAt: string }) {
  // Add "Created" as first entry
  const entries = [
    { status: 'created', changedBy: '', changedByName: 'System', changedAt: createdAt, comment: 'Request submitted' },
    ...[...history],
  ]

  return (
    <ol className="relative border-l border-gray-200 ml-3 space-y-0">
      {entries.map((entry, idx) => {
        const isFirst = idx === entries.length - 1
        const dot = STATUS_COLOR[entry.status] ?? 'bg-blue-400'
        const label = entry.status === 'created' ? 'Request Created' : (STATUS_LABEL[entry.status] ?? entry.status.replace(/_/g, ' '))

        return (
          <li key={idx} className="ml-5 pb-5 last:pb-0">
            <span className={cn(
              'absolute -left-1.5 h-3 w-3 rounded-full border-2 border-white',
              entry.status === 'created' ? 'bg-gray-400' : dot
            )} />
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-bold text-gray-800">{label}</span>
              {entry.changedByName && entry.changedByName !== 'System' && (
                <span className="text-[11px] text-gray-500 flex items-center gap-1">
                  <User className="h-3 w-3" /> {entry.changedByName}
                </span>
              )}
              <span className="text-[11px] text-gray-400">
                {new Date(entry.changedAt).toLocaleString('en-GB', {
                  day: '2-digit', month: 'short', year: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                })}
              </span>
              {entry.comment && entry.comment !== 'Request submitted' && (
                <span className="text-[11px] text-gray-500 italic mt-0.5">"{entry.comment}"</span>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function RequestDetailsPage({
  params,
}: {
  params: Promise<{ module: string; id: string }>
}) {
  const router = useRouter()
  const { data: session } = useSession()

  const [resolvedParams, setResolvedParams] = useState<{ module: string; id: string } | null>(null)
  const [request, setRequest] = useState<RequestDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)

  const isAdmin = session?.user?.role === 'super_admin' || session?.user?.role === 'admin' || session?.user?.role === 'manager'

  useEffect(() => { params.then(setResolvedParams) }, [params])

  useEffect(() => {
    if (!resolvedParams?.id || !resolvedParams?.module || !session?.user?.id) return

    if (isReservedRequestPathId(resolvedParams.id)) {
      const m = resolvedParams.module
      router.replace(resolvedParams.id.toLowerCase() === 'new' ? `/${m}/new` : `/${m}`)
      return
    }

    const fetchRequest = async () => {
      try {
        setIsLoading(true)
        const res = await fetch(`/api/requests/${resolvedParams.module}/${resolvedParams.id}`, { credentials: 'include' })
        if (!res.ok) throw new Error('Failed to fetch request')
        const data = await res.json()
        setRequest(data.ok ? data.data : data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load request')
      } finally {
        setIsLoading(false)
      }
    }

    fetchRequest()
  }, [resolvedParams, session, router])

  const handleStatusChange = async (newStatus: RequestStatus) => {
    if (!isAdmin || isUpdating || !resolvedParams || !request) return
    setIsUpdating(true)
    try {
      const res = await fetch(`/api/requests/${resolvedParams.module}/${resolvedParams.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) throw new Error('Failed to update status')
      const updated = await res.json()
      setRequest(updated.ok ? updated.data : { ...request, status: newStatus, updatedAt: new Date().toISOString() })
    } catch {
      alert('Failed to update status. Please try again.')
    } finally {
      setIsUpdating(false)
    }
  }

  if (isLoading || !resolvedParams) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-3" />
          <p className="text-sm text-gray-500">Loading request...</p>
        </div>
      </div>
    )
  }

  if (error || !request) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center space-y-3">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto" />
          <p className="font-medium text-gray-700">{error ?? 'Request not found'}</p>
          {resolvedParams && (
            <Link href={`/${resolvedParams.module}`}>
              <Button variant="outline" size="sm">Back to {resolvedParams.module}</Button>
            </Link>
          )}
        </div>
      </div>
    )
  }

  const ModuleIcon = MODULE_ICON[request.module] ?? Box
  const moduleColorClass = MODULE_COLOR[request.module] ?? 'text-gray-600 bg-gray-50'

  return (
    <div className="space-y-6 max-w-5xl mx-auto">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-start gap-4">
        <Link href={`/${resolvedParams.module}`}>
          <Button variant="ghost" size="sm" className="mt-1">
            <ArrowLeft className="h-4 w-4 mr-1.5" /> Back
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold capitalize", moduleColorClass)}>
              <ModuleIcon className="h-3.5 w-3.5" /> {request.module}
            </span>
            <span className="text-xs text-gray-400 font-mono">{request.id}</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 leading-tight">{request.title}</h1>
          <p className="text-xs text-gray-400 mt-1">
            Submitted by <span className="font-medium text-gray-600">{request.requester.name ?? request.requester.email}</span>
            {' · '}
            {new Date(request.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
          </p>
        </div>
      </div>

      {/* ── Tracking Timeline ────────────────────────────────────────────── */}
      <TrackingTimeline request={request} />

      {/* ── Body ────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left: Details + Status control */}
        <div className="lg:col-span-2 space-y-6">

          {/* Admin: status control */}
          {isAdmin && (
            <Card className="border border-blue-100 bg-blue-50/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-blue-700">Update Status</CardTitle>
              </CardHeader>
              <CardContent>
                <StatusDropdown
                  currentStatus={request.status}
                  onStatusChange={handleStatusChange}
                  disabled={isUpdating}
                  adminOnly={true}
                />
              </CardContent>
            </Card>
          )}

          {/* Request details / payload */}
          <Card className="border border-gray-100 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-gray-400" /> Request Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PayloadDisplay payload={request.payload} />
              <div className="mt-6 pt-4 border-t border-gray-100 flex gap-6 text-xs text-gray-400">
                <div>
                  <span className="font-semibold">Created</span>
                  <p className="text-gray-600 mt-0.5">{new Date(request.createdAt).toLocaleString('en-GB')}</p>
                </div>
                <div>
                  <span className="font-semibold">Last Updated</span>
                  <p className="text-gray-600 mt-0.5">{new Date(request.updatedAt).toLocaleString('en-GB')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Requester + Full history */}
        <div className="space-y-6">

          {/* Requester */}
          <Card className="border border-gray-100 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <User className="h-4 w-4 text-gray-400" /> Submitted By
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Name</p>
                <p className="text-sm font-medium text-gray-800 mt-0.5">{request.requester.name ?? '—'}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Email</p>
                <p className="text-sm text-gray-600 mt-0.5">{request.requester.email}</p>
              </div>
            </CardContent>
          </Card>

          {/* Full status history */}
          <Card className="border border-gray-100 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-400" /> Full History
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-1">
              <HistoryTimeline
                history={request.statusHistory ?? []}
                createdAt={request.createdAt}
              />
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  )
}
