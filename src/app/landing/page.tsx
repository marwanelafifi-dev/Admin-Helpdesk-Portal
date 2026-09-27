import Image from "next/image"
import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowUpRight, BriefcaseBusiness, Building2, ChevronRight, Globe2, Headset, Landmark, LayoutGrid, Monitor, ShieldCheck, UsersRound } from "lucide-react"
import { auth } from "@/auth"
import { LandingTopBar } from "@/components/layout/LandingTopBar"
import { PortalFeedbackLandingCard } from "@/components/feedback/PortalFeedbackLauncher"
import { PortalUpdatesLauncher } from "@/components/notices/PortalUpdatesLauncher"
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
  unavailable?: boolean
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
    accent: "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-cyan-200",
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
    const availability = platformSettings.supportFunctionAvailability[item.id]
    if (item.external) {
      if (!item.requiredPermission || !hasPermission(session.user!.permissions, item.requiredPermission)) return []
      return availability?.enabled ? [item] : [{
        ...item,
        href: "#function-unavailable",
        status: "Available soon",
        description: availability?.unavailableMessage || `${item.name} is currently unavailable.`,
        unavailable: true,
      }]
    }
    const allowedPath = item.accessPaths?.find((path) => canAccessPath(path, session.user!.permissions, session.user!.role))
    if (!allowedPath) return []
    if (!availability?.enabled) {
      return [{
        ...item,
        href: "#function-unavailable",
        status: "Available soon",
        description: availability?.unavailableMessage || `${item.name} is currently unavailable.`,
        unavailable: true,
      }]
    }
    return [{ ...item, href: allowedPath }]
  }).map((item) => item.name === "IT Team"
    ? { ...item, href: itServiceDeskUrl || "#it-service-desk", status: itServiceDeskUrl ? "SolarWinds" : "Unavailable" }
    : item)
  const supportFunctionOrder: SupportFunctionId[] = ["administration", "finance", "people", "it"]
  const functions: LandingDestination[] = visibleFunctions
    .sort((left, right) => supportFunctionOrder.indexOf(left.id) - supportFunctionOrder.indexOf(right.id))
    .map((item) => ({ ...item, logoUrl: platformSettings.supportFunctionLogos[item.id] || "" }))
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
    <main className="landing-page app-page-enter relative min-h-screen bg-[#f4f8fd] px-4 py-4 text-slate-900 dark:bg-[#07111f] dark:text-slate-100 lg:h-screen lg:overflow-hidden sm:px-6 sm:py-6">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[28rem] bg-[radial-gradient(ellipse_at_top,_rgba(191,219,254,0.9),_transparent_64%)] dark:bg-[radial-gradient(ellipse_at_top,_rgba(36,116,166,0.28),_transparent_58%)]" />
      <div className="pointer-events-none absolute -left-24 top-72 h-80 w-80 rounded-full bg-blue-100/30 blur-3xl dark:bg-cyan-500/10" />
      <div className="pointer-events-none absolute -right-20 top-28 h-96 w-96 rounded-full bg-blue-100/20 blur-3xl dark:bg-indigo-500/10" />
      {platformAdminPath && <Link href={platformAdminPath} aria-label="Open Platform Administration" title="Platform Administration" className="absolute left-3 top-3 z-10 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white/90 px-2.5 py-2 text-sm font-bold text-slate-700 shadow-sm transition hover:border-blue-300 hover:text-blue-700 dark:border-sky-300/20 dark:bg-[#10203a]/80 dark:text-slate-100 dark:shadow-[0_10px_28px_-18px_rgba(0,0,0,0.9)] dark:hover:border-cyan-300/60 dark:hover:bg-[#152a49] dark:hover:text-cyan-100 sm:left-6 sm:top-6 sm:px-3"><ShieldCheck className="h-4 w-4 text-blue-600 dark:text-cyan-300" /><span className="hidden sm:inline">Platform Administration</span></Link>}
      <div className="absolute right-3 top-3 z-20 sm:right-6 sm:top-6">
        <LandingTopBar />
      </div>
      <div className="landing-content relative mx-auto w-full max-w-[1728px] pt-14 sm:pt-0">
        <header className="landing-hero mb-5 flex flex-col items-center text-center sm:mb-6">
          <div className="landing-logo relative mb-1 h-14 w-40">
            <Image src="/siware-logo.png" alt="Si-Ware Systems" fill className="object-contain dark:brightness-0 dark:invert" priority />
          </div>
          <h1 className="mt-3 text-[32px] font-semibold tracking-[-0.035em] text-slate-950 dark:bg-gradient-to-r dark:from-white dark:via-sky-100 dark:to-cyan-200 dark:bg-clip-text dark:text-transparent sm:text-[38px]">How can we help today?</h1>
          <p className="mt-2 max-w-2xl text-[15px] leading-6 text-slate-600 sm:max-w-none sm:whitespace-nowrap dark:text-slate-300/95">
            Welcome {session.user.name || session.user.email}, Choose the team whose services you need.
          </p>
        </header>

        <section className="landing-support-section relative isolate overflow-hidden rounded-[28px] border border-blue-100 bg-gradient-to-br from-white/95 via-white/80 to-blue-50/75 p-4 shadow-[0_18px_60px_-38px_rgba(30,64,175,0.5)] backdrop-blur-sm dark:border-sky-300/20 dark:from-[#142945]/95 dark:via-[#0f2038]/95 dark:to-[#0b182d]/95 dark:shadow-[0_28px_80px_-42px_rgba(0,0,0,0.95)] sm:p-6" aria-labelledby="support-functions-heading">
          <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-32 bg-[radial-gradient(ellipse_at_center,_rgba(219,234,254,0.7),_transparent_70%)] dark:bg-[radial-gradient(ellipse_at_center,_rgba(56,189,248,0.12),_transparent_72%)]" />
          <div className="landing-section-heading relative mb-5 text-center">
            <div className="absolute right-0 top-0"><PortalUpdatesLauncher /></div>
            <div>
              <h2 id="support-functions-heading" className="text-[22px] font-semibold tracking-[-0.025em] text-slate-950 dark:text-white">Support Functions</h2>
            </div>
            <p className="mt-1.5 text-sm leading-5 text-slate-500 dark:text-slate-300">Choose a team to submit or manage requests.</p>
          </div>
        <div className="landing-support-grid grid gap-3 md:grid-cols-2 xl:grid-cols-4" aria-label="Support functions">
          {functions.map((item) => {
            const unavailableExternal = item.external && item.href.startsWith("#")
            const unavailable = item.unavailable || unavailableExternal
            const statusClasses = "bg-[#eef3ff] text-[#263d8b] dark:border dark:border-sky-300/10 dark:bg-sky-950/50 dark:text-sky-100"
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
                  {item.unavailable ? "Available soon" : unavailableExternal ? "Service Desk URL not configured" : item.external ? "Open Service Desk" : "Open services"} {!unavailable && <ChevronRight className="ml-1 h-4 w-4" />}
                </div>
              </>
            )
            const classes = "landing-support-card group relative flex min-h-[194px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-300 before:absolute before:inset-x-0 before:top-0 before:h-0.5 before:bg-[#263d8b] after:pointer-events-none after:absolute after:-right-12 after:-top-16 after:h-32 after:w-32 after:rounded-full after:bg-cyan-200/0 after:blur-2xl after:transition after:duration-300 hover:-translate-y-1 hover:border-cyan-300 hover:shadow-lg hover:shadow-blue-950/5 hover:after:bg-cyan-200/40 dark:border-sky-200/20 dark:!bg-[linear-gradient(145deg,_#172a45,_#11223a)] dark:shadow-[0_14px_30px_-24px_rgba(0,0,0,0.95)] dark:before:bg-gradient-to-r dark:before:from-blue-500 dark:before:via-cyan-300 dark:before:to-blue-500 dark:hover:border-cyan-300/80 dark:hover:!bg-[linear-gradient(145deg,_#1b3151,_#132943)] dark:hover:shadow-[0_18px_38px_-20px_rgba(8,145,178,0.38)] dark:hover:after:bg-cyan-400/20"
            if (unavailable) return <div key={item.name} id={item.unavailable ? "function-unavailable" : "it-service-desk"} className={`${classes} opacity-70`}>{content}</div>
            return item.external ? <a key={item.name} href={item.href} target="_blank" rel="noreferrer" className={classes}>{content}</a> : <Link key={item.name} href={item.href} className={classes}>{content}</Link>
          })}
        </div>
        </section>

        {visibleMainApps.length > 0 && (
          <section className="landing-apps-section relative overflow-hidden mt-5 rounded-[24px] border border-slate-200/80 bg-white/35 p-4 shadow-[0_12px_45px_-35px_rgba(15,23,42,0.4)] dark:border-sky-300/20 dark:bg-[#0d1d34]/88 dark:shadow-[0_22px_55px_-38px_rgba(0,0,0,0.95)]" aria-labelledby="main-apps-heading">
            <div className="landing-section-heading landing-apps-heading mb-3 text-center">
              <div>
                <h2 id="main-apps-heading" className="text-[22px] font-semibold tracking-[-0.025em] text-slate-950 dark:text-white">Main Apps</h2>
              </div>
              <p className="mt-1.5 text-sm leading-5 text-slate-500 dark:text-slate-300">Open the applications you use every day.</p>
            </div>
            <div className={`landing-apps-grid grid min-w-0 max-w-full gap-3 overflow-visible sm:grid-cols-2 md:grid-cols-4 ${mainAppsGridColumns}`}>
              {visibleMainApps.map((item, index) => {
                const unavailable = item.href.startsWith("#")
                const content = <><span className={`flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border shadow-sm ${MAIN_APP_ACCENTS[index % MAIN_APP_ACCENTS.length]}`}>{item.iconImage ? <img src={item.iconImage} alt="" className="h-full w-full object-contain p-1" /> : <item.icon className="h-[18px] w-[18px]" />}</span><div className="min-w-0 flex-1"><h3 title={item.name} className="break-words text-[15px] font-semibold leading-5 tracking-[-0.01em] text-slate-950 dark:text-white">{item.name}</h3><span className="mt-1.5 inline-flex items-center gap-1 text-xs font-bold text-[#263d8b] transition-transform group-hover:translate-x-0.5 dark:text-cyan-300">{unavailable ? "URL not configured" : "Open app"}{!unavailable && <ArrowUpRight className="h-3.5 w-3.5" />}</span></div></>
                const classes = "landing-app-card group flex min-h-[100px] min-w-0 items-center gap-3 rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-cyan-300 hover:bg-white hover:shadow-[0_0_0_5px_rgba(191,219,254,0.34),0_16px_34px_-12px_rgba(59,130,246,0.24)] dark:border-sky-200/20 dark:!bg-[#142640] dark:shadow-[0_12px_24px_-20px_rgba(0,0,0,0.9)] dark:hover:border-cyan-300/80 dark:hover:!bg-[#1a3150] dark:hover:shadow-[0_0_0_4px_rgba(34,211,238,0.09),0_18px_32px_-16px_rgba(8,145,178,0.45)]"
                return unavailable ? <div key={item.id} id="main-apps" className={`${classes} opacity-70`}>{content}</div> : <a key={item.id} href={item.href} target="_blank" rel="noreferrer" className={classes}>{content}</a>
              })}
            </div>
            <div className="mt-4"><PortalFeedbackLandingCard /></div>
          </section>
        )}
      </div>
    </main>
  )
}
