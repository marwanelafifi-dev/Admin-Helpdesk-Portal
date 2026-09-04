import Link from "next/link"
import { redirect } from "next/navigation"
import {
  Building2,
  CalendarDays,
  ChevronRight,
  Inbox,
  LayoutDashboard,
  Package,
  Plane,
  ShoppingCart,
  UserCog,
  Wrench,
} from "lucide-react"
import { auth } from "@/auth"
import { canAccessModule, canAccessPath, type RequestModule, type UserWithModuleAccess } from "@/lib/access"

export const runtime = "nodejs"

interface Service {
  title: string
  description: string
  href: string
  icon: typeof LayoutDashboard
  module?: RequestModule
}

interface ServiceGroup {
  title: string
  description: string
  services: Service[]
}

const serviceGroups: ServiceGroup[] = [
  {
    title: "Service Modules",
    description: "Submit and track operational requests across every Administration service.",
    services: [
      { title: "HR — Onboarding", description: "New hire onboarding requests: medical insurance, access card, and seating assignment.", href: "/hr/onboarding", icon: UserCog, module: "hr" },
      { title: "HR — Offboarding", description: "Employee offboarding requests: desk/office, farewell, medical closure, and access card collection.", href: "/hr/offboarding", icon: UserCog, module: "hr" },
      { title: "General Request", description: "Submit a general inquiry or request that doesn't fit another module.", href: "/general", icon: Inbox, module: "general" },
      { title: "Shipping — Import", description: "Incoming shipments from suppliers — track AWB, customs, and delivery status.", href: "/shipping/receiving", icon: Package, module: "shipping" },
      { title: "Shipping — Export", description: "Outgoing shipments — carrier, tracking number, and delivery status.", href: "/shipping/sending", icon: Package, module: "shipping" },
      { title: "Maintenance", description: "Facility and equipment maintenance tickets, prioritized by urgency.", href: "/maintenance", icon: Wrench, module: "maintenance" },
      { title: "Purchase", description: "Purchase orders and budget requests, with manager approval workflow.", href: "/purchase", icon: ShoppingCart, module: "purchase" },
      { title: "Event", description: "Event planning and logistics requests — internal or external venues.", href: "/event", icon: CalendarDays, module: "event" },
      { title: "Travel", description: "Visa applications and hotel & flight booking requests.", href: "/travel", icon: Plane, module: "travel" },
    ],
  },
]

export default async function AdminDepartmentPage() {
  const session = await auth()
  if (!session?.user) redirect("/login?callbackUrl=/departments/admin")

  const permissions = session.user.permissions
  const role = session.user.role
  const userWithModules: UserWithModuleAccess = {
    id: session.user.id,
    email: session.user.email ?? undefined,
    role,
    readModules: (session.user as any).readModules,
    readAllModules: (session.user as any).readAllModules,
  }

  function canSee(service: Service) {
    if (!canAccessPath(service.href, permissions, role)) return false
    if (service.module) return canAccessModule(userWithModules, service.module)
    return true
  }

  const visibleGroups = serviceGroups
    .map((group) => ({ ...group, services: group.services.filter(canSee) }))
    .filter((group) => group.services.length > 0)

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-blue-600 text-white"><Building2 className="h-7 w-7" /></div>
        <h1 className="mt-5 text-3xl font-bold text-slate-900 dark:text-white">Administration Team Services</h1>
        <p className="mt-3 text-slate-600 dark:text-slate-400">Access the complete Administration services portal and submit operational requests.</p>
      </div>

      {visibleGroups.map((group) => (
        <div key={group.title} className="rounded-xl border bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{group.title}</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{group.description}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {group.services.map((service) => (
              <Link
                key={service.href}
                href={service.href}
                className="flex items-center gap-4 rounded-xl border border-slate-200 p-4 transition hover:border-blue-400 hover:bg-blue-50/50 dark:border-slate-700 dark:hover:border-blue-700 dark:hover:bg-blue-950/30"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
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
      ))}
    </div>
  )
}
