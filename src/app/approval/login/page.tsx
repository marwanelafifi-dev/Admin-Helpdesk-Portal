"use client"

import { Suspense, useEffect } from "react"
import { signOut } from "next-auth/react"
import { useSearchParams } from "next/navigation"

function safeApprovalCallback(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return null
  const parsed = new URL(value, "http://portal.local")
  const isApprovalRoute = /^\/api\/requests\/[^/?]+\/(approve|reject)$/.test(parsed.pathname)
  return isApprovalRoute && parsed.searchParams.has("token") && parsed.searchParams.get("fresh") === "1"
    ? value
    : null
}

function ApprovalLoginHandoff() {
  const searchParams = useSearchParams()

  useEffect(() => {
    const callbackUrl = safeApprovalCallback(searchParams.get("callbackUrl"))
    const loginUrl = callbackUrl ? `/login?callbackUrl=${encodeURIComponent(callbackUrl)}` : "/login"
    // next-auth/react signs out through the protected POST flow without
    // showing NextAuth's browser confirmation screen.
    void signOut({ redirect: false }).finally(() => window.location.replace(loginUrl))
  }, [searchParams])

  return <div className="min-h-screen flex items-center justify-center bg-slate-100 text-slate-600">Opening secure sign-in…</div>
}

export default function ApprovalLoginPage() {
  return <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-100 text-slate-600">Opening secure sign-in…</div>}><ApprovalLoginHandoff /></Suspense>
}
