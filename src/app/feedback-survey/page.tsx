"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Star, Send, AlertCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { getFeedbackSurveys, submitFeedbackResponse, type FeedbackSurvey } from "@/services/feedbackService"

export default function FeedbackSurveyPage() {
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

    const surveys = getFeedbackSurveys()
    const found = surveys.find((s) => s.id === surveyId)

    if (!found) {
      setError("Survey not found or has already been completed")
      setLoading(false)
      return
    }

    if (found.status === "completed") {
      setError("This survey has already been completed")
      setLoading(false)
      return
    }

    setSurvey(found)
    setLoading(false)
  }, [surveyId])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!survey || rating === 0) {
      setError("Please provide a rating")
      return
    }

    const response = submitFeedbackResponse(survey.id, rating, comment)

    if (response) {
      setSubmitted(true)
      setTimeout(() => {
        router.push("/dashboard")
      }, 3000)
    } else {
      setError("Failed to submit feedback. Please try again.")
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <Card className="w-full max-w-md">
          <CardContent className="p-12 text-center">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-3/4 mx-auto mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-full mb-3"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6 mx-auto"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
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

  if (submitted || !survey) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <Card className="w-full max-w-md border-green-200 bg-green-50">
          <CardContent className="p-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-green-100 p-3">
                <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-green-900 mb-2">Thank You!</h2>
            <p className="text-green-700 mb-4">Your feedback has been submitted successfully</p>
            <p className="text-sm text-green-600">Redirecting you in a moment...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-lg">
            <CardTitle>Request Satisfaction Survey</CardTitle>
            <p className="text-blue-100 text-sm mt-2">Help us improve our service by sharing your feedback</p>
          </CardHeader>

          <CardContent className="p-8">
            {/* Request Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-600 mb-1">Request Details</p>
              <p className="font-semibold text-gray-900">{survey.requestTitle}</p>
              <div className="flex gap-4 mt-2 text-xs text-gray-600">
                <span>ID: {survey.requestId}</span>
                <span>Module: {survey.module.charAt(0).toUpperCase() + survey.module.slice(1)}</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Rating Question */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-4">
                  How satisfied are you with our service?
                </label>
                <div className="flex gap-3">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setRating(value)}
                      className="transition-transform hover:scale-110"
                    >
                      <Star
                        className={cn(
                          "h-10 w-10 transition-colors",
                          value <= rating
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-gray-300 hover:text-yellow-300"
                        )}
                      />
                    </button>
                  ))}
                </div>
                {rating > 0 && (
                  <p className="text-sm text-gray-600 mt-2">
                    You rated: <span className="font-semibold">{rating} out of 5 stars</span>
                  </p>
                )}
              </div>

              {/* Comment Section */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-3">
                  Additional Comments (Optional)
                </label>
                <Textarea
                  placeholder="Share your thoughts about the service, what went well, or areas for improvement..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="min-h-32 resize-none"
                />
              </div>

              {/* Rating Scale Guide */}
              <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-1">
                <p className="font-semibold text-gray-900 mb-2">Rating Scale:</p>
                <p><span className="font-semibold">5★</span> - Excellent service, very satisfied</p>
                <p><span className="font-semibold">4★</span> - Good service, mostly satisfied</p>
                <p><span className="font-semibold">3★</span> - Acceptable service, somewhat satisfied</p>
                <p><span className="font-semibold">2★</span> - Poor service, not satisfied</p>
                <p><span className="font-semibold">1★</span> - Very poor service, very dissatisfied</p>
              </div>

              {/* Submit Button */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={rating === 0}
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
          </CardContent>
        </Card>

        <p className="text-center text-sm text-gray-600 mt-6">
          Your feedback is valuable and helps us improve our services
        </p>
      </div>
    </div>
  )
}
