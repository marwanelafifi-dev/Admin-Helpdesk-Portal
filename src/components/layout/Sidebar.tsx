"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useSession } from "next-auth/react"
import {
  LayoutDashboard,
  FileText,
  Package,
  Wrench,
  ShoppingCart,
  CalendarDays,
  Plane,
  Users,
  UsersRound,
  UserCog,
  Shield,
  Settings,
  ClipboardList,
  ChevronDown,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  BarChart3,
  CheckSquare,
  AlertCircle,
  Database,
  Bell,
  Inbox,
  Building2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { canAccessPath } from "@/lib/access"
import { useNewRequestsAndTasks } from "@/hooks/useNewRequestsAndTasks"
import { useMobileNav } from "./MobileNavContext"

interface NavItem {
  title: string
  href: string
  icon: React.ElementType
  children?: Omit<NavItem, "children">[]
}

const navItems: NavItem[] = [
  {
    title: "Administration Team",
    href: "/dashboard",
    icon: Users,
    children: [
      { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { title: "Feedback & Reports", href: "/feedback-reports", icon: BarChart3 },
      { title: "Team Tasks", href: "/tasks", icon: CheckSquare },
      { title: "All Requests", href: "/admin/all-requests", icon: ClipboardList },
    ],
  },
  { title: "My Requests", href: "/requests", icon: FileText },
  { title: "Team Requests", href: "/team-requests", icon: UsersRound },
  {
    title: "HR",
    href: "/hr",
    icon: UserCog,
    children: [
      { title: "Onboarding", href: "/hr/onboarding", icon: UserCog },
      { title: "Offboarding", href: "/hr/offboarding", icon: UserCog },
    ],
  },
  { title: "General Request", href: "/general", icon: Inbox },
  {
    title: "Shipping",
    href: "/shipping",
    icon: Package,
    children: [
      { title: "Receiving", href: "/shipping/receiving", icon: Package },
      { title: "Sending", href: "/shipping/sending", icon: Package },
    ],
  },
  { title: "Maintenance", href: "/maintenance", icon: Wrench },
  { title: "Purchase", href: "/purchase", icon: ShoppingCart },
  { title: "Event", href: "/event", icon: CalendarDays },
  { title: "Travel", href: "/travel", icon: Plane },
  {
    title: "Admin",
    href: "/admin",
    icon: Settings,
    children: [
      { title: "Users", href: "/admin/users", icon: Users },
      { title: "Roles", href: "/admin/roles", icon: Shield },
      { title: "Settings", href: "/admin/settings", icon: Settings },
      { title: "Notifications", href: "/admin/notifications", icon: Bell },
      { title: "Company Data", href: "/admin/company-data", icon: Building2 },
      { title: "Audit Trail", href: "/admin/audit-trail", icon: Shield },
      { title: "Database", href: "/admin/database", icon: Database },
    ],
  },
]

const SETTINGS_KEY = "arp_platform_settings"

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session, status } = useSession()
  const [collapsed, setCollapsed] = useState(false)

  // Listen for the topbar hamburger toggle. On desktop the hamburger
  // collapses/expands the sidebar; on mobile the same button opens the
  // drawer (handled by MobileNavContext instead).
  useEffect(() => {
    const onToggle = () => setCollapsed((c) => !c)
    window.addEventListener("arp:toggle-sidebar", onToggle)
    return () => window.removeEventListener("arp:toggle-sidebar", onToggle)
  }, [])
  const [brandName, setBrandName] = useState("Admin Portal")
  const [brandSubtitle, setBrandSubtitle] = useState("Si-Ware Systems")
  const [administrationExpanded, setAdministrationExpanded] = useState(
    pathname.startsWith("/admin/all-requests") || pathname.startsWith("/tasks") || pathname.startsWith("/feedback-reports")
  )
  const [adminExpanded, setAdminExpanded] = useState(
    pathname.startsWith("/admin") && pathname !== "/admin/all-requests"
  )
  const [shippingExpanded, setShippingExpanded] = useState(pathname.startsWith("/shipping"))
  const [hrExpanded, setHrExpanded] = useState(pathname.startsWith("/hr"))
  // When the sidebar is collapsed, clicking a parent opens a flyout popover
  // anchored to that parent's row so the user can pick a child page without
  // expanding the whole sidebar. Tracked by parent title.
  const [flyoutOpen, setFlyoutOpen] = useState<string | null>(null)
  // Close the flyout when the user navigates away or clicks elsewhere.
  useEffect(() => {
    setFlyoutOpen(null)
  }, [pathname])
  useEffect(() => {
    if (!flyoutOpen) return
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest("[data-sidebar-flyout]") && !target.closest("[data-sidebar-flyout-trigger]")) {
        setFlyoutOpen(null)
      }
    }
    document.addEventListener("mousedown", onClick)
    return () => document.removeEventListener("mousedown", onClick)
  }, [flyoutOpen])

  const permissions = session?.user?.permissions ?? []
  const role = session?.user?.role
  const { open: mobileOpen } = useMobileNav()

  // Per-module "new" request counts and todo task count.
  // Drives small badges next to sidebar items so admins can see at a glance
  // which module pages have new submissions waiting.
  const { newRequestsByModule, newTasksCount } = useNewRequestsAndTasks()
  // Only Administration Team / Full Access should see the per-page badges.
  // Regular requesters submit their own requests — they don't need to be
  // notified that they themselves have items in "New" status.
  const isAdminAudience = role === "Full Access" || role === "Administration Team"

  const searchParams = useSearchParams()
  const source = searchParams.get("source")

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY)
      if (raw) {
        const s = JSON.parse(raw)
        if (s.sidebarBrandName) setBrandName(s.sidebarBrandName)
        if (s.sidebarBrandSubtitle) setBrandSubtitle(s.sidebarBrandSubtitle)
      }
    } catch {}
  }, [])

  // Note: new-request and new-task tracking is centralized in useNewRequestsAndTasks
  // hook above. Storage events, focus, and a 30s interval keep it fresh.

  const canSee = (href: string) => status === "authenticated" && canAccessPath(href, permissions, role)

  /**
   * Map a sidebar nav href to a module key in the engine, so we can look up
   * per-module "new" request counts. Leaf pages like /hr/new still belong to
   * the same module. Pages with no module association return null and don't
   * get a badge.
   */
  function moduleForHref(href: string): string | null {
    if (href === "/hr/onboarding" || href.startsWith("/hr/onboarding/")) return "hr-onboarding"
    if (href === "/hr/offboarding" || href.startsWith("/hr/offboarding/")) return "hr-offboarding"
    if (href.startsWith("/hr")) return "hr"
    // Shipping has two sub-buckets: receiving and sending. Match the leaves
    // first so each child link gets only its own count; the parent /shipping
    // still resolves to the aggregate.
    if (href === "/shipping/receiving" || href.startsWith("/shipping/receiving/")) return "shipping-receiving"
    if (href === "/shipping/sending"   || href.startsWith("/shipping/sending/"))   return "shipping-sending"
    if (href.startsWith("/shipping")) return "shipping"
    if (href.startsWith("/maintenance")) return "maintenance"
    if (href.startsWith("/purchase")) return "purchase"
    if (href.startsWith("/event")) return "event"
    if (href.startsWith("/travel")) return "travel"
    if (href.startsWith("/general")) return "general"
    return null
  }

  /**
   * Total badge count for a sidebar entry. Aggregates module-specific "new"
   * counts plus special cases (tasks for Team Tasks, all-requests for All Requests).
   * Returns 0 when the audience shouldn't see badges (non-admin users).
   */
  function badgeCountForHref(href: string): number {
    if (!isAdminAudience) return 0
    if (href === "/tasks") return newTasksCount
    if (href === "/admin/all-requests") {
      // Sum only the real module buckets — skip the synthetic
      // shipping-receiving / shipping-sending sub-buckets, otherwise every
      // shipping request gets counted twice.
      return Object.entries(newRequestsByModule)
        .filter(([key]) => !key.includes("-"))
        .reduce((sum, [, count]) => sum + count, 0)
    }
    const mod = moduleForHref(href)
    if (mod) return newRequestsByModule[mod] ?? 0
    return 0
  }

  const visibleNavItems = navItems.reduce<NavItem[]>((items, item) => {
      const children = item.children?.filter((child) => canSee(child.href))
      const itemVisible = canSee(item.href) || Boolean(children?.length)

      if (!itemVisible) {
        return items
      }

      items.push({
        ...item,
        children: children?.length ? children : undefined,
      })

      return items
    }, [])

  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard"
    }

    if (pathname.startsWith("/requests/")) {
      if (href === "/admin/all-requests") {
        return source === "all-requests"
      }
      if (href === "/requests") {
        return source === "my-requests"
      }
      return source === href.slice(1)
    }

    if (href === "/admin") {
      return pathname.startsWith("/admin") && pathname !== "/admin/all-requests"
    }

    if (href === "/admin/all-requests") {
      return pathname === "/admin/all-requests"
    }

    if (href === "/requests") {
      return pathname === "/requests"
    }

    // Administration Team parent (don't highlight as active, only children)
    if (href === "/admin/all-requests" && (pathname.startsWith("/tasks") || pathname.startsWith("/feedback-reports"))) {
      return false
    }

    return pathname.startsWith(href)
  }

  return (
    <aside
      className={cn(
        // Below lg: fixed drawer that slides in from the left. Above lg: stays
        // inline in the flex layout next to the page content.
        "fixed inset-y-0 left-0 z-40 flex flex-col bg-slate-900 text-white",
        "transition-transform duration-300 ease-in-out lg:transition-all lg:translate-x-0",
        mobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full",
        "lg:relative lg:flex-shrink-0",
        collapsed ? "w-64 lg:w-16" : "w-64"
      )}
    >
      {/* Branding */}
      <Link href="/landing" className={cn(
        "flex items-center gap-3 border-b border-slate-700 py-4 px-5 hover:bg-slate-800 transition-colors",
        collapsed && "justify-center px-0"
      )} suppressHydrationWarning>
        <div className={cn("overflow-hidden", collapsed && "hidden")}>
          <span className="font-bold text-sm tracking-tight whitespace-nowrap text-white">
            {brandName}
          </span>
          <p className="text-xs text-slate-400 mt-0.5">{brandSubtitle}</p>
        </div>
      </Link>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 space-y-0.5 px-2">
        {visibleNavItems.map((item) => {
          if (item.children) {
            const isAdmin = item.title === "Admin"
            const isShipping = item.title === "Shipping"
            const isHR = item.title === "HR"
            const isAdministration = item.title === "Administration Team"

            let expanded = false
            let setExpandedFn: (val: boolean) => void = () => {}
            let active = false

            if (isAdmin) {
              expanded = adminExpanded
              setExpandedFn = (val) => setAdminExpanded(val)
              active = pathname.startsWith("/admin") && pathname !== "/admin/all-requests"
            } else if (isShipping) {
              expanded = shippingExpanded
              setExpandedFn = (val) => setShippingExpanded(val)
              active = pathname.startsWith("/shipping") && pathname !== "/shipping"
            } else if (isHR) {
              expanded = hrExpanded
              setExpandedFn = (val) => setHrExpanded(val)
              active = pathname.startsWith("/hr") && pathname !== "/hr"
            } else if (isAdministration) {
              expanded = administrationExpanded
              setExpandedFn = (val) => setAdministrationExpanded(val)
              active = pathname.startsWith("/admin/all-requests") || pathname.startsWith("/tasks") || pathname.startsWith("/feedback-reports") || pathname === "/dashboard"
            }

            const isFlyoutOpen = flyoutOpen === item.title
            return (
              <div key={item.title} className="relative">
                <button
                  data-sidebar-flyout-trigger
                  onClick={() => {
                    if (collapsed) {
                      // On collapsed sidebar: expand the sidebar, open the
                      // section, and soft-navigate to the first child.
                      // router.push avoids the full-page reload that
                      // window.location.href triggers.
                      const firstChild = item.children?.[0]
                      setCollapsed(false)
                      setExpandedFn(true)
                      if (firstChild) {
                        router.push(firstChild.href)
                      }
                    } else {
                      setExpandedFn(!expanded)
                    }
                  }}
                  title={collapsed ? item.title : undefined}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                    active
                      ? "bg-blue-600 text-white"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  )}
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left whitespace-nowrap truncate">{item.title}</span>
                      {(() => {
                        // Aggregate badge counts across all children that the user can see.
                        // For Administration Team's parent, that means All Requests + Team Tasks.
                        const parentBadge = (item.children ?? []).reduce(
                          (sum, c) => sum + badgeCountForHref(c.href),
                          0
                        )
                        return parentBadge > 0 ? (
                          <span
                            className={cn(
                              "inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full text-[10px] font-bold animate-in zoom-in-50 duration-300",
                              active ? "bg-white text-blue-700" : "bg-red-500 text-white"
                            )}
                            title={`${parentBadge} new`}
                          >
                            {parentBadge > 99 ? "99+" : parentBadge}
                          </span>
                        ) : null
                      })()}
                      {expanded ? (
                        <ChevronDown className="h-4 w-4 text-slate-400" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-slate-400" />
                      )}
                    </>
                  )}
                </button>

                {!collapsed && expanded && (
                  <div className="ml-3 mt-0.5 space-y-0.5 border-l border-slate-700 pl-3">
                    {item.children.map((child) => {
                      const childActive = pathname === child.href
                      const childBadge = badgeCountForHref(child.href)

                      return (
                        <Link
                          key={child.title}
                          href={child.href}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                            childActive
                              ? "bg-blue-600 text-white"
                              : "text-slate-400 hover:bg-slate-800 hover:text-white"
                          )}
                        >
                          <child.icon className="h-4 w-4 flex-shrink-0" />
                          <span className="flex-1 whitespace-nowrap truncate">{child.title}</span>
                          {childBadge > 0 && (
                            <span
                              className={cn(
                                "inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full text-[10px] font-bold animate-in zoom-in-50 duration-300",
                                childActive ? "bg-white text-blue-700" : "bg-red-500 text-white"
                              )}
                              title={`${childBadge} new`}
                            >
                              {childBadge > 99 ? "99+" : childBadge}
                            </span>
                          )}
                        </Link>
                      )
                    })}
                  </div>
                )}

                {/* Collapsed-sidebar flyout: rendered into a portal-like
                    position via `fixed`, anchored to the trigger's bounding
                    rect so the nav's overflow-y-auto can't clip it. */}
                {/* Flyout removed — clicking a collapsed parent expands the
                    sidebar and navigates to its first child instead. */}
              </div>
            )
          }

          const active = isActive(item.href)
          return (
            <Link
              key={item.title}
              href={item.href}
              title={collapsed ? item.title : undefined}
              className={cn(
                "relative flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                collapsed && "justify-center",
                active
                  ? "bg-blue-600 text-white"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              )}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {!collapsed && (
                <>
                  <span className="flex-1 whitespace-nowrap truncate">{item.title}</span>
                  {(() => {
                    const count = badgeCountForHref(item.href)
                    if (count <= 0) return null
                    return (
                      <span
                        className={cn(
                          "inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full text-[10px] font-bold animate-in zoom-in-50 duration-300",
                          active ? "bg-white text-blue-700" : "bg-red-500 text-white"
                        )}
                        title={`${count} new`}
                      >
                        {count > 99 ? "99+" : count}
                      </span>
                    )
                  })()}
                </>
              )}
              {/* When collapsed, show a small dot indicator on the icon if there are new items */}
              {collapsed && badgeCountForHref(item.href) > 0 && (
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Collapse toggle */}
      <div className="border-t border-slate-700 p-2">
        <button
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="w-full flex items-center justify-center p-2 rounded-md text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
        >
          {collapsed ? (
            <PanelLeftOpen className="h-5 w-5" />
          ) : (
            <PanelLeftClose className="h-5 w-5" />
          )}
        </button>
      </div>
    </aside>
  )
}

/**
 * Floating submenu shown when a collapsed-sidebar parent is clicked.
 * Uses `position: fixed` so it escapes the parent `<nav>`'s overflow-y-auto
 * which would otherwise clip an absolutely-positioned panel.
 *
 * Positioning logic: anchors to the bounding rect of the trigger button
 * carrying `[data-sidebar-flyout-trigger]` inside the current row, with a
 * small left offset so it sits just outside the sidebar.
 */
function CollapsedFlyout({
  title,
  childItems,
  pathname,
  badgeCountForHref,
  onClose,
}: {
  title: string
  childItems: Array<{ title: string; href: string; icon: React.ElementType }>
  pathname: string
  badgeCountForHref: (href: string) => number
  onClose: () => void
}) {
  const router = useRouter()
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  useEffect(() => {
    // Find the trigger button that opened us (its sibling parent's trigger).
    // We tag the current row by searching the DOM for the matching title.
    const triggers = document.querySelectorAll<HTMLElement>("[data-sidebar-flyout-trigger]")
    let anchor: HTMLElement | null = null
    triggers.forEach((t) => {
      if (t.getAttribute("title") === title || t.textContent?.includes(title)) {
        anchor = t
      }
    })
    if (!anchor) return
    const rect = (anchor as HTMLElement).getBoundingClientRect()
    setPos({ top: rect.top, left: rect.right + 4 })
  }, [title])

  useEffect(() => {
    // Close on outside click only — clicks on flyout children navigate
    // programmatically via router.push, so we don't need to special-case
    // them here. Listener is registered on the next tick so the click
    // that opened the flyout doesn't immediately close it.
    let active = false
    const armId = setTimeout(() => { active = true }, 0)
    const onClick = (e: MouseEvent) => {
      if (!active) return
      const target = e.target as HTMLElement
      if (target.closest("[data-collapsed-flyout]")) return
      if (target.closest("[data-sidebar-flyout-trigger]")) return
      onClose()
    }
    document.addEventListener("click", onClick)
    return () => {
      clearTimeout(armId)
      document.removeEventListener("click", onClick)
    }
  }, [onClose])

  if (!pos) return null

  return (
    <div
      data-collapsed-flyout
      style={{ position: "fixed", top: pos.top, left: pos.left, zIndex: 60 }}
      className="min-w-[220px] rounded-md border border-slate-700 bg-slate-900 shadow-2xl py-1"
    >
      <div className="px-3 py-2 border-b border-slate-700 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
        {title}
      </div>
      {childItems.map((child) => {
        const childActive = pathname === child.href
        const childBadge = badgeCountForHref(child.href)
        return (
          <button
            key={child.title}
            type="button"
            // Navigate programmatically — router.push is synchronous from
            // the caller's POV, and we close the flyout right after. No
            // <Link> involved so there's no race with React's synthetic
            // click delegation vs the document-level outside-click listener.
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              console.log("[Flyout] navigating to:", child.href)
              onClose()
              // Hard navigate via window.location to bypass any router
              // weirdness. A full page reload is fine for sidebar clicks.
              window.location.href = child.href
            }}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 text-sm text-left transition-colors",
              childActive
                ? "bg-blue-600 text-white"
                : "text-slate-300 hover:bg-slate-800 hover:text-white"
            )}
          >
            <child.icon className="h-4 w-4 flex-shrink-0" />
            <span className="flex-1 whitespace-nowrap truncate">{child.title}</span>
            {childBadge > 0 && (
              <span
                className={cn(
                  "inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full text-[10px] font-bold",
                  childActive ? "bg-white text-blue-700" : "bg-red-500 text-white"
                )}
              >
                {childBadge > 99 ? "99+" : childBadge}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
