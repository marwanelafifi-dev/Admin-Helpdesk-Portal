"use client"

import { useEffect } from "react"
import { AlertCircle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

/** Shared error boundary for route rendering failures. */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Route rendering error:", error)
  }, [error])

  return (
    <main id="main-content" className="mx-auto flex min-h-[60vh] max-w-lg items-center px-4 py-12" role="alert">
      <section className="w-full rounded-xl border bg-card p-6 text-center shadow-sm sm:p-8">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertCircle className="h-6 w-6" aria-hidden="true" />
        </div>
        <h1 className="mt-5 text-xl font-semibold">This page could not load</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Your work has not been changed. Please try again, or return to the dashboard and continue from there.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Button onClick={reset}>
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Try again
          </Button>
          <Button variant="outline" asChild>
            <a href="/dashboard">Return to dashboard</a>
          </Button>
        </div>
      </section>
    </main>
  )
}
