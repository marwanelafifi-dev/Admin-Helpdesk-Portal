import Link from "next/link"

export default function UnauthorizedPage({
  searchParams,
}: {
  searchParams?: { from?: string }
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-6">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-sm border">
        <h1 className="text-2xl font-semibold text-slate-900">Access denied</h1>
        <p className="mt-3 text-sm text-slate-600">
          You don’t have permission to do this action.
        </p>
        {searchParams?.from ? (
          <p className="mt-2 text-xs text-slate-500">Blocked route: {searchParams.from}</p>
        ) : null}
        <div className="mt-6">
          <Link
            href="/landing"
            className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Go to your start page
          </Link>
        </div>
      </div>
    </div>
  )
}
