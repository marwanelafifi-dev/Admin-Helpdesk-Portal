"use client"

import { useEffect, useState } from "react"
import { CheckCircle2, X } from "lucide-react"

const STORAGE_KEY = "company-portal:request-submission-success"

type SubmissionNotice = {
  requestId: string
  title: string
}

function readPendingNotice(): SubmissionNotice | null {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    window.sessionStorage.removeItem(STORAGE_KEY)
    const parsed = JSON.parse(raw) as Partial<SubmissionNotice>
    return typeof parsed.requestId === "string" && typeof parsed.title === "string" ? { requestId: parsed.requestId, title: parsed.title } : null
  } catch {
    return null
  }
}

/** Shows the confirmation created by submitRequest, including after navigation. */
export function RequestSubmissionSuccess() {
  const [notice, setNotice] = useState<SubmissionNotice | null>(null)

  useEffect(() => {
    const showPendingNotice = () => {
      const pending = readPendingNotice()
      if (pending) setNotice(pending)
    }
    const onSubmitted = (event: Event) => {
      const detail = (event as CustomEvent<SubmissionNotice>).detail
      if (detail?.requestId && detail?.title) {
        window.sessionStorage.removeItem(STORAGE_KEY)
        setNotice(detail)
      }
    }

    showPendingNotice()
    window.addEventListener("company-portal:request-submitted", onSubmitted)
    return () => window.removeEventListener("company-portal:request-submitted", onSubmitted)
  }, [])

  useEffect(() => {
    if (!notice) return
    const timeout = window.setTimeout(() => setNotice(null), 8000)
    return () => window.clearTimeout(timeout)
  }, [notice])

  if (!notice) return null

  return (
    <div role="alert" className="fixed right-4 top-4 z-[100] w-[min(28rem,calc(100vw-2rem))] animate-in slide-in-from-top-3 fade-in duration-300">
      <div className="relative flex gap-3 overflow-hidden rounded-2xl border border-blue-200 bg-gradient-to-br from-white via-[#f8fbff] to-[#e8f2ff] p-4 shadow-[0_22px_42px_-18px_rgba(30,64,175,0.34)] before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-blue-600 dark:border-sky-200/20 dark:!bg-[linear-gradient(145deg,_#172a45,_#11223a)] dark:shadow-[0_18px_38px_-20px_rgba(0,0,0,0.95)] dark:before:bg-blue-400">
        <span className="relative z-10 mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 shadow-sm dark:border-emerald-400/25 dark:bg-emerald-400/10">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-300" />
        </span>
        <div className="relative z-10 min-w-0 flex-1">
          <p className="font-semibold text-[#173f91] dark:text-white">Request submitted successfully</p>
          <p className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-300">
            {notice.title} <span className="font-medium text-slate-800 dark:text-slate-100">({notice.requestId})</span> has been sent. You can follow its progress in My Requests.
          </p>
        </div>
        <button type="button" aria-label="Dismiss confirmation" onClick={() => setNotice(null)} className="relative z-10 rounded-md p-1 text-slate-400 transition-colors hover:bg-blue-100 hover:text-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:hover:bg-blue-400/15 dark:hover:text-blue-100">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
