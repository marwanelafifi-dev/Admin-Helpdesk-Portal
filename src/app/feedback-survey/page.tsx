"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Star, Send, AlertCircle } from "lucide-react"
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
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="mb-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/siware-logo.png" alt="Si-Ware Systems" className="h-12 w-auto" />
        </div>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading survey...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <div className="mb-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/siware-logo.png" alt="Si-Ware Systems" className="h-12 w-auto" />
        </div>
        <Card className="w-full max-w-md border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
              <div>
                <p className="font-semibold text-red-900">{error}</p>
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
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="mb-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/siware-logo.png" alt="Si-Ware Systems" className="h-12 w-auto" />
      </div>
      <div className="w-full max-w-lg">
        <Card className="border-0 shadow-xl">
          <CardHeader className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-t-lg">
            <CardTitle>Feedback Survey</CardTitle>
            <p className="text-sm text-slate-300 mt-1">
              How satisfied are you with this service?
            </p>
          </CardHeader>

          <CardContent className="p-8">
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-4">
                    Rate your experience
                  </label>
                  <div className="flex gap-3">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        className={cn(
                          "p-2 rounded-lg transition-all",
                          rating >= star
                            ? "bg-yellow-100 scale-110"
                            : "bg-gray-100 hover:bg-gray-200"
                        )}
                      >
                        <Star
                          className={cn(
                            "h-8 w-8",
                            rating >= star
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-gray-400"
                          )}
                        />
                      </button>
                    ))}
                  </div>
                  {rating > 0 && (
                    <p className="text-sm text-gray-600 mt-2">
                      {["Poor", "Fair", "Good", "Very Good", "Excellent"][
                        rating - 1
                      ]}{" "}
                      ({rating}/5)
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-2">
                    Additional Comments (Optional)
                  </label>
                  <Textarea
                    id="comment"
                    placeholder="Tell us what we can improve..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="h-24 resize-none"
                  />
                </div>

                <div className="flex gap-3">
                  <Button
                    type="submit"
                    disabled={!rating}
                    className="flex-1 bg-slate-900 hover:bg-slate-800"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Submit Feedback
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => router.push("/dashboard")}
                  >
                    Skip
                  </Button>
                </div>
              </form>
            )}

            <p className="text-center text-sm text-gray-600 mt-6">
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
