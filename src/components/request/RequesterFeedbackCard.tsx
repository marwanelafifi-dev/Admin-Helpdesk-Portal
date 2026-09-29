"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { CheckCircle2, Send, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { functionForModule, requestModuleLabel } from "@/lib/functionRegistry"

type FeedbackRequest = {
  id: string
  title: string
  module: string
  status: string
  requesterId: string
  requesterEmail?: string
}

/** Shared feedback control for specialised detail pages that do not render the main request-detail component. */
export function RequesterFeedbackCard({ request }: { request: FeedbackRequest }) {
  const { data: session } = useSession()
  const [enabled, setEnabled] = useState<boolean | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const sessionEmail = session?.user?.email?.trim().toLowerCase()
  const isRequester = request.requesterId === session?.user?.id
    || Boolean(sessionEmail && request.requesterEmail?.trim().toLowerCase() === sessionEmail)
  const isComplete = request.status === "completed" || request.status === "delivered"

  useEffect(() => {
    if (!isRequester || !isComplete) return
    const owner = functionForModule(request.module)
    void Promise.all([fetch("/api/admin/settings"), fetch("/api/feedback/responses")])
      .then(async ([settingsResponse, responsesResponse]) => {
        if (settingsResponse.ok) {
          const settings = await settingsResponse.json()
          setEnabled(settings.settings?.feedbackSurveysByFunction?.[owner]?.enabled !== false)
        } else {
          setEnabled(true)
        }
        if (responsesResponse.ok) {
          const responses = await responsesResponse.json()
          const existing = (responses.responses ?? []).find((item: { requestId?: string }) => item.requestId === request.id)
          if (existing) setSubmitted(true)
        }
      })
      .catch(() => setEnabled(true))
  }, [isComplete, isRequester, request.id, request.module])

  if (!isComplete || !isRequester || enabled !== true) return null

  return (
    <Card className="border-emerald-200 bg-emerald-50/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base"><Star className="h-5 w-5 text-emerald-700" />Service Feedback</CardTitle>
        <p className="text-xs text-slate-600">Rate your completed {requestModuleLabel(request.module)} request.</p>
      </CardHeader>
      <CardContent>
        {submitted ? <div className="flex items-center gap-2 text-sm font-medium text-emerald-700"><CheckCircle2 className="h-5 w-5" />Thank you — your feedback has been recorded.</div> : (
          <div className="space-y-4">
            <div className="flex gap-2">{[1, 2, 3, 4, 5].map((value) => <button key={value} type="button" aria-label={`${value} stars`} onClick={() => setRating(value)}><Star className={cn("h-7 w-7", rating >= value ? "fill-yellow-400 text-yellow-400" : "text-slate-300")} /></button>)}</div>
            <textarea value={comment} onChange={(event) => setComment(event.target.value)} rows={3} placeholder="Tell us what we can improve..." className="w-full rounded-lg border border-slate-200 bg-white p-3 text-sm" />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button disabled={!rating || saving} onClick={async () => {
              setSaving(true); setError("")
              try {
                const response = await fetch("/api/feedback/inline", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requestId: request.id, rating, comment }) })
                if (response.ok) setSubmitted(true)
                else setError("Feedback could not be submitted. Please refresh and try again.")
              } catch { setError("Feedback could not be submitted. Please try again.") }
              finally { setSaving(false) }
            }} className="bg-emerald-600 hover:bg-emerald-700"><Send className="mr-2 h-4 w-4" />{saving ? "Submitting..." : "Submit Feedback"}</Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
