"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { Sidebar } from "./Sidebar"
import { TopBar } from "./TopBar"
import { MobileNavProvider, useMobileNav } from "./MobileNavContext"
import { useEngineSync } from "@/hooks/useEngineSync"
import { useHeartbeat } from "@/hooks/useHeartbeat"
import { SecurityActivityTracker } from "./SecurityActivityTracker"

/**
 * Dashboard shell: sidebar (drawer on mobile) + topbar + main content area.
 * Server-side layout.tsx wraps this around `children`.
 */
export function Shell({ children, portal = "admin" }: { children: React.ReactNode; portal?: "admin" | "hr" | "finance" | "platform-admin" }) {
  return (
    <MobileNavProvider>
      <ShellInner portal={portal}>{children}</ShellInner>
    </MobileNavProvider>
  )
}

function ShellInner({ children, portal }: { children: React.ReactNode; portal: "admin" | "hr" | "finance" | "platform-admin" }) {
  const { open, setOpen } = useMobileNav()
  const pathname = usePathname()
  const [availability, setAvailability] = useState({ checked: portal === "platform-admin", enabled: true, message: "" })
  // Pulls /api/requests on mount + every 30s + on focus so localStorage
  // stays in step with what other users have submitted.
  useEngineSync()
  useHeartbeat()

  useEffect(() => {
    if (portal === "platform-admin") return
    const settingId = portal === "hr" ? "people" : portal === "finance" ? "finance" : "administration"
    fetch("/api/admin/settings")
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        const setting = data?.settings?.supportFunctionAvailability?.[settingId]
        setAvailability({
          checked: true,
          enabled: setting?.enabled !== false,
          message: setting?.unavailableMessage || "This function is currently unavailable.",
        })
      })
      .catch(() => setAvailability({ checked: true, enabled: true, message: "" }))
  }, [portal])

  if (availability.checked && !availability.enabled) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6 dark:bg-slate-950">
        <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Function unavailable</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{availability.message}</p>
          <a href="/landing" className="mt-6 inline-flex rounded-lg bg-[#263d8b] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1e3275]">Return to portal</a>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background relative" suppressHydrationWarning>
      <SecurityActivityTracker />
      {/* Sidebar — fixed drawer below lg, static beside content at lg+ */}
      <Sidebar portal={portal} />

      {/* Backdrop when mobile drawer is open */}
      {open && (
        <button
          aria-label="Close menu"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm lg:hidden"
        />
      )}

      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <TopBar portal={portal} />
        <main id="main-content" tabIndex={-1} className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 focus:outline-none">
          <div key={pathname} className="app-page-enter">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
