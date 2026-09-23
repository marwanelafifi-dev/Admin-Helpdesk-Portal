/**
 * Shared route-transition fallback. Individual pages can still provide a
 * richer loading.tsx later; this keeps every other page from appearing to
 * have ignored a navigation click while data or code is loading.
 */
export default function Loading() {
  return (
    <div className="min-h-[calc(100vh-8rem)] animate-pulse space-y-6" aria-busy="true" aria-label="Loading page">
      <div className="space-y-3">
        <div className="h-8 w-56 rounded-md bg-muted" />
        <div className="h-4 w-80 max-w-full rounded bg-muted/70" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="h-28 rounded-lg border bg-card p-5">
            <div className="h-4 w-24 rounded bg-muted" />
            <div className="mt-4 h-7 w-16 rounded bg-muted/70" />
          </div>
        ))}
      </div>
      <div className="h-72 rounded-lg border bg-card" />
      <span className="sr-only">Loading page content</span>
    </div>
  )
}
