import Link from "next/link"
import { ShieldAlert } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function UnauthorizedPage({
  searchParams,
}: {
  searchParams?: Promise<{ from?: string }>
}) {
  const params = await searchParams
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
      className="bg-slate-100 dark:bg-slate-950"
    >
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 text-center shadow-xl shadow-slate-200/40 dark:shadow-black/40">
        <div className="mx-auto mb-5 h-14 w-14 rounded-full bg-red-100 dark:bg-red-950/30 flex items-center justify-center">
          <ShieldAlert className="h-7 w-7 text-red-600 dark:text-red-400" />
        </div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Access denied</h1>
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
          You don&rsquo;t have permission to view this page.
        </p>
        {params?.from ? (
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-500 break-all">
            Blocked route: <span className="font-mono">{params.from}</span>
          </p>
        ) : null}
        <div className="mt-7 flex flex-col sm:flex-row gap-2 justify-center">
          <Link
            href="/landing"
            className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            Go to your start page
          </Link>
          {/* Go through NextAuth's signout endpoint so the session cookie
              is actually cleared. A plain Link to /login would be caught
              by the middleware ("you're already signed in → /dashboard")
              and loop back to /unauthorized. */}
          <a
            href="/api/auth/signout?callbackUrl=/login"
            className="inline-flex items-center justify-center rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            Sign in with another account
          </a>
        </div>
      </div>
    </div>
  )
}
