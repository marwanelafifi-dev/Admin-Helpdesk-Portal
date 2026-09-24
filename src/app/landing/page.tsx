import Image from "next/image"
import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowUpRight, BriefcaseBusiness, Building2, ChevronRight, Globe2, Headset, Landmark, LayoutGrid, Monitor, ShieldCheck, UsersRound } from "lucide-react"
import { auth } from "@/auth"
import { LandingTopBar } from "@/components/layout/LandingTopBar"
import { canAccessPath, getFirstAllowedPlatformAdminPath, hasPermission } from "@/lib/access"
import { loadSettingsServer } from "@/lib/settingsServer"
import type { MainAppIcon, SupportFunctionId } from "@/lib/platformSettings"

export const runtime = "nodejs"

interface LandingDestination {
  id: SupportFunctionId
  name: string
  description: string
  href: string
  icon: typeof BriefcaseBusiness
  accent: string
  status: string
  external?: boolean
  logoUrl?: string
  accessPaths?: string[]
  requiredPermission?: string
}

const baseFunctions: LandingDestination[] = [
  {
    id: "administration",
    name: "Administration Team",
    description: "Access the complete Administration services portal and submit operational requests.",
    href: "/departments/admin",
    icon: BriefcaseBusiness,
    accent: "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-cyan-200",
    status: "Available",
    accessPaths: ["/departments/admin", "/dashboard", "/shipping", "/hr", "/maintenance", "/purchase", "/event", "/travel", "/general", "/requests"],
  },
  {
    id: "people",
    name: "People Team",
    description: "Access Human Resources services, policies, and employee support.",
    href: "/departments/hr/services",
    icon: UsersRound,
    accent: "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-cyan-200",
    status: "Available",
    accessPaths: ["/departments/hr/services", "/departments/hr", "/departments/hr/general", "/departments/hr/letter", "/departments/hr/my-requests", "/departments/hr/team-requests", "/departments/hr/all-requests"],
  },
  {
    id: "finance",
    name: "Finance Team",
    description: "Access Finance services and submit finance-related requests.",
    href: "/departments/finance/services",
    icon: Landmark,
    accent: "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-cyan-200",
    status: "Available",
    accessPaths: ["/departments/finance/services", "/departments/finance", "/departments/finance/reimbursement", "/departments/finance/travel-reimbursement", "/departments/finance/invoices", "/departments/finance/my-requests", "/departments/finance/team-requests", "/departments/finance/all-requests"],
  },
  {
    id: "it",
    name: "IT Team",
    description: "IT incidents and service requests are managed in the SolarWinds Service Desk.",
    href: process.env.NEXT_PUBLIC_IT_SERVICE_DESK_URL || "#it-service-desk",
    icon: Headset,
    accent: "border-cyan-200 bg-cyan-50 text-[#263d8b] dark:border-cyan-500/60 dark:bg-cyan-950/60 dark:text-cyan-200",
    status: "SolarWinds",
    external: true,
    requiredPermission: "page:it-services",
  },
]

const MAIN_APP_ICONS: Record<MainAppIcon, typeof Headset> = { headset: Headset, monitor: Monitor, globe: Globe2, layout: LayoutGrid, building: Building2, users: UsersRound }
const MAIN_APP_ACCENTS = [
  "border-cyan-200 bg-cyan-50 text-[#263d8b]",
  "border-[#b7c8ee] bg-[#eef3ff] text-[#263d8b]",
  "border-cyan-200 bg-[#f0fbfd] text-[#246d9b]",
  "border-[#c8d6f4] bg-[#f4f7ff] text-[#263d8b]",
  "border-cyan-200 bg-[#effafd] text-[#246d9b]",
  "border-[#b7c8ee] bg-[#eef3ff] text-[#263d8b]",
  "border-cyan-200 bg-cyan-50 text-[#246d9b]",
  "border-[#c8d6f4] bg-[#f4f7ff] text-[#263d8b]",
  "border-cyan-200 bg-[#effafd] text-[#246d9b]",
]

export default async function DepartmentSelectorPage() {
  const session = await auth()
  if (!session?.user) redirect("/login?callbackUrl=/landing")
  const platformSettings = loadSettingsServer()
  const itServiceDeskUrl = platformSettings.itServiceDeskEnabled
    ? platformSettings.itServiceDeskUrl.trim() || process.env.NEXT_PUBLIC_IT_SERVICE_DESK_URL || ""
    : ""

  // Platform Administration is only shown to users who hold at least one
  // of the platform-admin permissions (manage_users, settings, etc.) —
  // unlike the department tiles above, it isn't open to everyone.
  const platformAdminPath = getFirstAllowedPlatformAdminPath(session.user.permissions, session.user.role)
  const visibleFunctions = baseFunctions.flatMap((item) => {
    if (item.external) return item.requiredPermission && hasPermission(session.user!.permissions, item.requiredPermission) ? [item] : []
    const allowedPath = item.accessPaths?.find((path) => canAccessPath(path, session.user!.permissions, session.user!.role))
    return allowedPath ? [{ ...item, href: allowedPath }] : []
  }).map((item) => item.name === "IT Team"
    ? { ...item, href: itServiceDeskUrl || "#it-service-desk", status: itServiceDeskUrl ? "SolarWinds" : "Unavailable" }
    : item)
  const functions: LandingDestination[] = visibleFunctions.map((item) => ({ ...item, logoUrl: platformSettings.supportFunctionLogos[item.id] || "" }))
  const visibleMainApps = platformSettings.mainApps
    .filter((app) => app.enabled && app.name.trim())
    .map((app) => {
      const isLegacyItApp = app.id === "main-app-1" && app.name === "IT Service Desk"
      const href = app.url.trim() || (isLegacyItApp && platformSettings.itServiceDeskEnabled ? itServiceDeskUrl : "")
      return { ...app, href: href || "#main-apps", icon: MAIN_APP_ICONS[app.icon], status: isLegacyItApp ? "SolarWinds" : "Company app" }
    })
  const mainAppsGridColumns = visibleMainApps.length >= 9
    ? "xl:grid-cols-9"
    : visibleMainApps.length === 8
      ? "xl:grid-cols-8"
      : visibleMainApps.length === 7
        ? "xl:grid-cols-7"
        : visibleMainApps.length === 6
          ? "xl:grid-cols-6"
          : visibleMainApps.length === 5
            ? "xl:grid-cols-5"
            : "xl:grid-cols-4"

  return (
    <main className="relative min-h-screen bg-[#f4f8fd] px-4 py-5 text-slate-900 dark:bg-[#0b1220] dark:text-slate-100 lg:h-screen lg:overflow-hidden sm:px-6 sm:py-6">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[25rem] bg-[radial-gradient(ellipse_at_top,_rgba(191,219,254,0.9),_transparent_64%)] dark:bg-[radial-gradient(ellipse_at_top,_rgba(18,72,112,0.34),_transparent_64%)]" />
      <div className="pointer-events-none absolute -left-24 top-72 h-80 w-80 rounded-full bg-blue-100/30 blur-3xl dark:bg-blue-900/10" />
      {platformAdminPath && <Link href={platformAdminPath} className="absolute left-4 top-4 z-10 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white/90 px-3 py-2 text-sm font-bold text-slate-700 shadow-sm transition hover:border-blue-300 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 sm:left-6 sm:top-6"><ShieldCheck className="h-4 w-4 text-blue-600" />Platform Administration</Link>}
      <div className="absolute right-4 top-4 z-20 sm:right-6 sm:top-6">
        <LandingTopBar />
      </div>
      <div className="relative mx-auto w-full max-w-[1728px]">
        <header className="mb-5 flex flex-col items-center text-center sm:mb-6">
          <div className="relative mb-1 h-14 w-40">
            <Image src="/siware-logo.png" alt="Si-Ware Systems" fill className="object-contain dark:brightness-0 dark:invert" priority />
          </div>
          <h1 className="mt-3 text-[32px] font-semibold tracking-[-0.035em] text-slate-950 dark:text-white sm:text-[38px]">How can we help today?</h1>
          <p className="mt-2 max-w-2xl text-[15px] leading-6 text-slate-600 sm:max-w-none sm:whitespace-nowrap dark:text-slate-300">
            Welcome {session.user.name || session.user.email}, Choose the team whose services you need.
          </p>
        </header>

        <section className="rounded-[28px] border border-blue-100 bg-gradient-to-br from-white/95 via-white/80 to-blue-50/75 p-5 shadow-[0_18px_60px_-38px_rgba(30,64,175,0.5)] backdrop-blur-sm dark:border-[#29436b] dark:from-[#13233d] dark:via-[#101d33] dark:to-[#0d1930] sm:p-6" aria-labelledby="support-functions-heading">
          <div className="mb-5 text-center">
            <div>
              <h2 id="support-functions-heading" className="text-[22px] font-semibold tracking-[-0.025em] text-slate-950 dark:text-white">Support Functions</h2>
            </div>
            <p className="mt-1.5 text-sm leading-5 text-slate-500 dark:text-slate-300">Choose a team to submit or manage requests.</p>
          </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4" aria-label="Support functions">
          {functions.map((item) => {
            const unavailableExternal = item.external && item.href.startsWith("#")
            const statusClasses = item.external
              ? "bg-cyan-100 text-[#263d8b] dark:bg-cyan-950/60 dark:text-cyan-200"
              : "bg-[#eef3ff] text-[#263d8b] dark:bg-blue-950/60 dark:text-blue-200"
            const content = (
              <>
                <div className="flex items-start justify-between gap-4">
                  <span className={`flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl border shadow-sm ${item.accent}`}>
                    {item.logoUrl ? <img src={item.logoUrl} alt="" className="h-full w-full object-contain p-1" /> : <item.icon className="h-5 w-5 stroke-[1.75]" />}
                  </span>
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusClasses}`}>{item.status}</span>
                </div>
                <h3 className="mt-4 text-[17px] font-semibold leading-6 tracking-[-0.015em] text-slate-900 dark:text-white">{item.name}</h3>
                <p className="mt-1.5 text-sm leading-5 text-slate-600 dark:text-slate-300">{item.description}</p>
                <div className="mt-auto flex items-center pt-4 text-sm font-bold text-blue-600 dark:text-cyan-300">
                  {unavailableExternal ? "Service Desk URL not configured" : item.external ? "Open Service Desk" : "Open services"} {!unavailableExternal && <ChevronRight className="ml-1 h-4 w-4" />}
                </div>
              </>
            )
            const classes = "group relative flex min-h-[194px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 before:absolute before:inset-x-0 before:top-0 before:h-0.5 before:bg-[#263d8b] hover:-translate-y-1 hover:border-cyan-300 hover:shadow-lg hover:shadow-blue-950/5 dark:border-[#405372] dark:!bg-[#18263b] dark:hover:border-cyan-400 dark:hover:shadow-cyan-950/30"
            if (unavailableExternal) return <div key={item.name} id="it-service-desk" className={`${classes} opacity-70`}>{content}</div>
            return item.external ? <a key={item.name} href={item.href} target="_blank" rel="noreferrer" className={classes}>{content}</a> : <Link key={item.name} href={item.href} className={classes}>{content}</Link>
          })}
        </div>
        </section>

        {visibleMainApps.length > 0 && (
          <section className="mt-5 rounded-[24px] border border-slate-200/80 bg-white/35 p-4 shadow-[0_12px_45px_-35px_rgba(15,23,42,0.4)] dark:border-[#29436b] dark:bg-[#101d33]/90" aria-labelledby="main-apps-heading">
            <div className="mb-3 text-center">
              <div>
                <h2 id="main-apps-heading" className="text-[22px] font-semibold tracking-[-0.025em] text-slate-950 dark:text-white">Main Apps</h2>
              </div>
              <p className="mt-1.5 text-sm leading-5 text-slate-500 dark:text-slate-300">Open the applications you use every day.</p>
            </div>
            <div className={`grid min-w-0 max-w-full gap-3 overflow-hidden sm:grid-cols-2 lg:grid-cols-4 ${mainAppsGridColumns}`}>
              {visibleMainApps.map((item, index) => {
                const unavailable = item.href.startsWith("#")
                const content = <><span className={`flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border shadow-sm ${MAIN_APP_ACCENTS[index % MAIN_APP_ACCENTS.length]}`}>{item.iconImage ? <img src={item.iconImage} alt="" className="h-full w-full object-contain p-1" /> : <item.icon className="h-[18px] w-[18px]" />}</span><div className="min-w-0 flex-1"><h3 title={item.name} className="break-words text-[15px] font-semibold leading-5 tracking-[-0.01em] text-slate-950 dark:text-white">{item.name}</h3><span className="mt-1.5 inline-flex items-center gap-1 text-xs font-bold text-[#263d8b] transition-transform group-hover:translate-x-0.5 dark:text-cyan-300">{unavailable ? "URL not configured" : "Open app"}{!unavailable && <ArrowUpRight className="h-3.5 w-3.5" />}</span></div></>
                const classes = "group flex min-h-[100px] min-w-0 items-center gap-3 rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-cyan-300 hover:bg-white hover:shadow-md dark:border-[#405372] dark:!bg-[#16243a] dark:hover:border-cyan-400 dark:hover:!bg-[#1b2e48]"
                return unavailable ? <div key={item.id} id="main-apps" className={`${classes} opacity-70`}>{content}</div> : <a key={item.id} href={item.href} target="_blank" rel="noreferrer" className={classes}>{content}</a>
              })}
            </div>
          </section>
        )}
      </div>
    </main>
  )
}
