import { Wrench } from "lucide-react"
import { readMaintenanceState } from "@/lib/maintenanceMode"

export const dynamic = "force-dynamic"

/**
 * Public maintenance page shown when an admin has flipped the app into
 * Maintenance Mode via Admin → Settings. Non-admin users hit this from
 * every dashboard route until the flag is cleared.
 */
export default async function MaintenancePage() {
  const state = readMaintenanceState()
  const message = state.maintenanceMessage || "We're doing maintenance — we'll be right back."

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-950 px-4">
      <div className="max-w-md w-full text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl shadow-slate-200/40 dark:shadow-black/40 p-10">
        <div className="mx-auto mb-6 h-16 w-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
          <Wrench className="h-8 w-8 text-amber-600 dark:text-amber-400" />
        </div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-3">Maintenance in progress</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{message}</p>
        <p className="text-xs text-slate-400 mt-8">Si-Ware Systems Admin Helpdesk Portal</p>
      </div>
    </div>
  )
}
