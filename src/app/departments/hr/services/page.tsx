import Link from "next/link"
import { redirect } from "next/navigation"
import { ChevronRight, Inbox, Users } from "lucide-react"
import { auth } from "@/auth"
import { canAccessPath } from "@/lib/access"

export const runtime = "nodejs"

interface Service {
  title: string
  description: string
  href: string
  icon: typeof Users
}

// HR — Onboarding/Offboarding are NOT here: those are requests other
// departments submit *to* the HR Team via the Admin Portal's Admin Team
// Services page. This page only lists services the HR Team offers directly
// to requesters. Add future HR-facing services here as they're built.
const services: Service[] = [
  { title: "General Request", description: "Submit a general inquiry or request to the HR Team.", href: "/departments/hr/general", icon: Inbox },
]

export default async function HRDepartmentServicesPage() {
  const session = await auth()
  if (!session?.user) redirect("/login?callbackUrl=/departments/hr/services")

  const permissions = session.user.permissions
  const role = session.user.role
  const visibleServices = services.filter((service) => canAccessPath(service.href, permissions, role))

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-teal-600 text-white"><Users className="h-7 w-7" /></div>
        <h1 className="mt-5 text-3xl font-bold text-slate-900 dark:text-white">HR Team Services</h1>
        <p className="mt-3 text-slate-600 dark:text-slate-400">Select an HR service to submit a request or review your existing requests.</p>
      </div>

      {visibleServices.length > 0 && (
        <div className="rounded-xl border bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Service Modules</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Submit and track requests across every HR service.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {visibleServices.map((service) => (
              <Link
                key={service.href}
                href={service.href}
                className="flex items-center gap-4 rounded-xl border border-slate-200 p-4 transition hover:border-teal-400 hover:bg-teal-50/50 dark:border-slate-700 dark:hover:border-teal-700 dark:hover:bg-teal-950/30"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300">
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
