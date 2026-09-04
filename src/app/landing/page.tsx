import Image from "next/image"
import Link from "next/link"
import { redirect } from "next/navigation"
import { Building2, Calculator, ChevronRight, Headphones, Users } from "lucide-react"
import { auth } from "@/auth"
import { LandingTopBar } from "@/components/layout/LandingTopBar"

export const runtime = "nodejs"

interface SupportFunction {
  name: string
  description: string
  href: string
  icon: typeof Building2
  accent: string
  status: string
  external?: boolean
}

const functions: SupportFunction[] = [
  {
    name: "Administration Team",
    description: "Access the complete Administration services portal and submit operational requests.",
    href: "/departments/admin",
    icon: Building2,
    accent: "bg-blue-600",
    status: "Available",
  },
  {
    name: "HR Team",
    description: "Access Human Resources services, policies, and employee support.",
    href: "/departments/hr/services",
    icon: Users,
    accent: "bg-teal-600",
    status: "Available",
  },
  {
    name: "Finance Team",
    description: "Access Finance services and submit finance-related requests.",
    href: "/departments/finance",
    icon: Calculator,
    accent: "bg-amber-600",
    status: "Coming next week",
  },
  {
    name: "IT Team",
    description: "IT incidents and service requests are managed in the SolarWinds Service Desk.",
    href: process.env.NEXT_PUBLIC_IT_SERVICE_DESK_URL || "#it-service-desk",
    icon: Headphones,
    accent: "bg-violet-600",
    status: "SolarWinds",
    external: true,
  },
]

export default async function DepartmentSelectorPage() {
  const session = await auth()
  if (!session?.user) redirect("/login?callbackUrl=/landing")

  return (
    <main className="relative min-h-screen bg-slate-100 dark:bg-slate-950 px-4 py-10 sm:px-6">
      <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
        <LandingTopBar />
      </div>
      <div className="mx-auto max-w-5xl">
        <header className="mb-10 flex flex-col items-center text-center">
          <div className="relative mb-5 h-20 w-48">
            <Image src="/siware-logo.png" alt="Si-Ware Systems" fill className="object-contain" priority />
          </div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">Company Portal</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Select a support function</h1>
          <p className="mt-3 max-w-2xl text-sm text-slate-600 dark:text-slate-400">
            Welcome, {session.user.name || session.user.email}. Choose the team whose services you need. You can return here at any time to select another team.
          </p>
        </header>

        <section className="grid gap-5 sm:grid-cols-2" aria-label="Support functions">
          {functions.map((item) => {
            const href = item.href
            const unavailableExternal = item.external && href.startsWith("#")
            const content = (
              <>
                <div className="flex items-start justify-between gap-4">
                  <span className={`flex h-12 w-12 items-center justify-center rounded-xl text-white ${item.accent}`}>
                    <item.icon className="h-6 w-6" />
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">{item.status}</span>
                </div>
                <h2 className="mt-5 text-lg font-bold text-slate-900 dark:text-white">{item.name}</h2>
                <p className="mt-2 min-h-10 text-sm leading-5 text-slate-600 dark:text-slate-400">{item.description}</p>
                <div className="mt-5 flex items-center text-sm font-semibold text-blue-600">
                  {unavailableExternal ? "Service Desk URL not configured" : item.external ? "Open Service Desk" : "Open services"}
                  {!unavailableExternal && <ChevronRight className="ml-1 h-4 w-4" />}
                </div>
              </>
            )

            const classes = "rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
            if (unavailableExternal) return <div key={item.name} id="it-service-desk" className={`${classes} opacity-75`}>{content}</div>
            return item.external ? (
              <a key={item.name} href={href} target="_blank" rel="noreferrer" className={classes}>{content}</a>
            ) : (
              <Link key={item.name} href={href} className={classes}>{content}</Link>
            )
          })}
        </section>
      </div>
    </main>
  )
}
