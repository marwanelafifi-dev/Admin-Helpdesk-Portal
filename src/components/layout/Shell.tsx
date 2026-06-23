"use client"

import { Sidebar } from "./Sidebar"
import { TopBar } from "./TopBar"
import { MobileNavProvider, useMobileNav } from "./MobileNavContext"
import { useEngineSync } from "@/hooks/useEngineSync"
import { useHeartbeat } from "@/hooks/useHeartbeat"

/**
 * Dashboard shell: sidebar (drawer on mobile) + topbar + main content area.
 * Server-side layout.tsx wraps this around `children`.
 */
export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <MobileNavProvider>
      <ShellInner>{children}</ShellInner>
    </MobileNavProvider>
  )
}

function ShellInner({ children }: { children: React.ReactNode }) {
  const { open, setOpen } = useMobileNav()
  // Pulls /api/requests on mount + every 30s + on focus so localStorage
  // stays in step with what other users have submitted.
  useEngineSync()
  useHeartbeat()

  return (
    <div className="flex h-screen overflow-hidden bg-background relative" suppressHydrationWarning>
      {/* Sidebar — fixed drawer below lg, static beside content at lg+ */}
      <Sidebar />

      {/* Backdrop when mobile drawer is open */}
      {open && (
        <button
          aria-label="Close menu"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm lg:hidden"
        />
      )}

      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6">{children}</main>
      </div>
    </div>
  )
}
