"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Star, Send, AlertCircle, MessageSquare, ArrowRight } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import type { FeedbackSurvey } from "@/services/feedbackService"

export const dynamic = "force-dynamic"

function FeedbackSurveyContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const surveyId = searchParams.get("id")

  const [survey, setSurvey] = useState<FeedbackSurvey | null>(null)
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!surveyId) {
      setError("Invalid survey link")
      setLoading(false)
      return
    }

    let cancelled = false
    fetch(`/api/feedback/survey/${encodeURIComponent(surveyId)}`)
      .then(async (res) => {
        if (cancelled) return
        if (res.status === 404) {
          setError("Survey not found or has already been completed")
          setLoading(false)
          return
        }
        if (!res.ok) {
          setError("Could not load survey. Please try again later.")
          setLoading(false)
          return
        }
        const data = await res.json()
        if (data.survey?.status === "completed") {
          setError("This survey has already been completed")
          setLoading(false)
          return
        }
        setSurvey(data.survey)
        setLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        setError("Could not load survey. Please try again later.")
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [surveyId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!rating || !survey) return

    try {
      const res = await fetch(`/api/feedback/survey/${encodeURIComponent(survey.id)}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, comment }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        setError(err.error === "not_found_or_already_completed"
          ? "This survey has already been completed"
          : "Failed to submit feedback. Please try again.")
        return
      }
      setSubmitted(true)
      setTimeout(() => { router.push("/") }, 3000)
    } catch {
      setError("Failed to submit feedback. Please try again.")
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#071a33] bg-[radial-gradient(circle_at_50%_-10%,rgba(42,114,209,0.52),transparent_37%),linear-gradient(135deg,#071a33_0%,#102b4f_52%,#06182f_100%)] px-4">
        <div className="mb-7 rounded-2xl border border-white/60 !bg-white px-5 py-3 shadow-xl shadow-slate-950/30">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/siware-logo.png" alt="Si-Ware Systems" className="h-12 w-auto" />
        </div>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-300 mx-auto mb-4"></div>
          <p className="text-slate-200">Loading your secure survey...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#071a33] bg-[radial-gradient(circle_at_50%_-10%,rgba(42,114,209,0.52),transparent_37%),linear-gradient(135deg,#071a33_0%,#102b4f_52%,#06182f_100%)] p-4">
        <div className="mb-7 rounded-2xl border border-white/60 !bg-white px-5 py-3 shadow-xl shadow-slate-950/30">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/siware-logo.png" alt="Si-Ware Systems" className="h-12 w-auto" />
        </div>
        <Card className="w-full max-w-md border border-rose-300/70 !bg-white shadow-2xl shadow-slate-950/30 dark:!bg-[#101d31] dark:text-slate-100">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
              <div>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">{error}</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => router.push("/dashboard")}
                >
                  Return to Dashboard
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#071a33] bg-[radial-gradient(circle_at_50%_-10%,rgba(42,114,209,0.52),transparent_37%),linear-gradient(135deg,#071a33_0%,#102b4f_52%,#06182f_100%)] p-4 sm:p-6">
      <div className="mb-7 rounded-2xl border border-white/60 !bg-white px-5 py-3 shadow-xl shadow-slate-950/30">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/siware-logo.png" alt="Si-Ware Systems" className="h-12 w-auto" />
      </div>
      <div className="w-full max-w-xl">
        <Card className="overflow-hidden border border-[#315678] !bg-white shadow-2xl shadow-slate-950/40 dark:border-[#315678] dark:!bg-[#101d31] dark:text-slate-100">
          <CardHeader className="border-b border-blue-400/25 bg-[radial-gradient(circle_at_100%_0%,rgba(84,202,255,0.28),transparent_40%),linear-gradient(135deg,#0b2444_0%,#153d73_100%)] px-6 py-6 text-white sm:px-8">
            <div className="flex items-start gap-3">
              <div className="rounded-xl border border-cyan-200/30 bg-cyan-200/10 p-2.5"><MessageSquare className="h-5 w-5 text-cyan-200" /></div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-100">Si-Ware Portal</p>
                <CardTitle className="mt-1 text-xl">Service feedback</CardTitle>
                <p className="mt-1 text-sm text-blue-100">
                  How satisfied are you with this service?
                </p>
              </div>
            </div>
            <div className="mt-5 rounded-xl border border-white/15 bg-slate-950/15 px-4 py-3">
              <p className="truncate text-sm font-semibold text-white">{survey?.requestTitle}</p>
              <p className="mt-0.5 text-xs text-blue-100">{survey?.requestId} · {survey?.module?.replace(/_/g, " ")}</p>
            </div>
          </CardHeader>

          <CardContent className="p-6 sm:p-8 dark:!bg-[#101d31]">
            {submitted ? (
              <div className="text-center py-8">
                <div className="text-5xl mb-4">✓</div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Thank You!</h2>
                <p className="text-gray-600 mb-4">
                  Your feedback has been recorded successfully
                </p>
                <p className="text-sm text-gray-500">
                  Redirecting to dashboard in 3 seconds...
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 sm:p-5 dark:border-[#315678] dark:!bg-[#112942]">
                  <label className="block text-sm font-semibold text-slate-800 mb-4 dark:text-slate-100">
                    Rate your experience
                  </label>
                  <div className="flex gap-2.5 sm:gap-3">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        aria-label={`${star} star${star === 1 ? "" : "s"}`}
                        aria-pressed={rating === star}
                        className={cn(
                          "rounded-xl border p-2.5 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
                          rating >= star
                            ? "border-amber-200 bg-amber-50 shadow-sm dark:border-amber-300/50 dark:!bg-amber-400/15"
                            : "border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50 dark:border-[#365a84] dark:!bg-[#0a192d] dark:hover:border-cyan-300 dark:hover:!bg-[#123454]"
                        )}
                      >
                        <Star
                          className={cn(
                            "h-8 w-8",
                            rating >= star
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-gray-400 dark:text-slate-400"
                          )}
                        />
                      </button>
                    ))}
                  </div>
                  {rating > 0 && (
                    <p className="text-sm font-medium text-[#185ea9] mt-3 dark:text-cyan-200">
                      {["Poor", "Fair", "Good", "Very Good", "Excellent"][
                        rating - 1
                      ]}{" "}
                      ({rating}/5)
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="comment" className="block text-sm font-semibold text-slate-800 mb-2 dark:text-slate-100">
                    Additional Comments (Optional)
                  </label>
                  <Textarea
                    id="comment"
                    placeholder="Tell us what we can improve..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="h-28 resize-none border-slate-200 bg-slate-50/60 focus-visible:ring-[#2563eb] dark:border-[#365a84] dark:!bg-[#0a182b] dark:text-slate-100 dark:placeholder:text-slate-400"
                  />
                </div>

                <div className="flex flex-col-reverse gap-3 sm:flex-row">
                  <Button
                    type="submit"
                    disabled={!rating}
                    className="flex-1 bg-[#2563eb] hover:bg-[#1d4ed8] dark:bg-[#2f75e8] dark:text-white dark:hover:bg-[#4288f4]"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Submit Feedback
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-[#45678e] dark:!bg-[#0b192b] dark:text-slate-100 dark:hover:!bg-[#152d49]"
                    onClick={() => router.push("/dashboard")}
                  >
                    Skip for now
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </form>
            )}

            <p className="border-t border-slate-100 pt-5 text-center text-sm text-slate-500 mt-6 dark:border-[#284664] dark:text-slate-300">
              Your feedback is valuable and helps us improve our services
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function FeedbackSurveyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <FeedbackSurveyContent />
    </Suspense>
  )
}
