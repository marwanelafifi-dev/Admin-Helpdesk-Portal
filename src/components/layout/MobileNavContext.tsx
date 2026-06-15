"use client"

import { createContext, useCallback, useContext, useEffect, useState } from "react"
import { usePathname } from "next/navigation"

interface MobileNavContextValue {
  open: boolean
  setOpen: (v: boolean) => void
  toggle: () => void
}

const MobileNavContext = createContext<MobileNavContextValue | null>(null)

export function MobileNavProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  // Auto-close the drawer when the route changes — clicking a sidebar link
  // shouldn't leave the drawer covering the new page on mobile.
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  // Lock body scroll when the drawer is open so iOS Safari doesn't double-scroll.
  useEffect(() => {
    if (typeof document === "undefined") return
    document.body.style.overflow = open ? "hidden" : ""
    return () => { document.body.style.overflow = "" }
  }, [open])

  const toggle = useCallback(() => setOpen((v) => !v), [])

  return (
    <MobileNavContext.Provider value={{ open, setOpen, toggle }}>
      {children}
    </MobileNavContext.Provider>
  )
}

export function useMobileNav() {
  const ctx = useContext(MobileNavContext)
  // Sidebar/TopBar render outside the provider in tests / storybook — return
  // safe defaults so the components don't crash.
  if (!ctx) return { open: false, setOpen: () => {}, toggle: () => {} }
  return ctx
}
