import Link from "next/link"
import { redirect } from "next/navigation"
import { Calculator, ChevronRight, Receipt } from "lucide-react"
import { auth } from "@/auth"
import { canAccessPath } from "@/lib/access"

export const runtime = "nodejs"

interface Service {
  title: string
  description: string
  href: string
  icon: typeof Calculator
}

// Add future Finance-facing services here as they're built.
const services: Service[] = [
  { title: "Reimbursement Request", description: "Submit an expense for reimbursement, with manager approval.", href: "/departments/finance/reimbursement", icon: Receipt },
]

export default async function FinanceDepartmentServicesPage() {
  const session = await auth()
  if (!session?.user) redirect("/login?callbackUrl=/departments/finance/services")

  const permissions = session.user.permissions
  const role = session.user.role
  const visibleServices = services.filter((service) => canAccessPath(service.href, permissions, role))

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-amber-600 text-white"><Calculator className="h-7 w-7" /></div>
        <h1 className="mt-5 text-3xl font-bold text-slate-900 dark:text-white">Finance Team Services</h1>
        <p className="mt-3 text-slate-600 dark:text-slate-400">Select a Finance service to submit a request or review your existing requests.</p>
      </div>

      {visibleServices.length > 0 && (
        <div className="rounded-xl border bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Service Modules</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Submit and track requests across every Finance service.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {visibleServices.map((service) => (
              <Link
                key={service.href}
                href={service.href}
                className="flex items-center gap-4 rounded-xl border border-slate-200 p-4 transition hover:border-amber-400 hover:bg-amber-50/50 dark:border-slate-700 dark:hover:border-amber-700 dark:hover:bg-amber-950/30"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                  <service.icon className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-slate-900 dark:text-white">{service.title}</span>
                  <span className="mt-1 block text-sm text-slate-500 dark:text-slate-400">{service.description}</span>
                </span>
                <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
