import { Calculator, Clock } from "lucide-react"

export default function FinanceDepartmentPage() {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-amber-600 text-white"><Calculator className="h-7 w-7" /></div>
        <h1 className="mt-5 text-3xl font-bold text-slate-900 dark:text-white">Finance Team Services</h1>
        <p className="mt-3 text-slate-600 dark:text-slate-400">Select a Finance service to submit a request or review your existing requests.</p>

        <div className="mt-8 border-t pt-8 dark:border-slate-800">
          <div className="flex items-center gap-4 rounded-xl border border-dashed border-slate-200 p-5 dark:border-slate-700">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
              <Clock className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold text-slate-900 dark:text-white">No Finance services are available yet</span>
              <span className="mt-1 block text-sm text-slate-500 dark:text-slate-400">Finance request workflows are scheduled for the next rollout. Check back soon.</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
