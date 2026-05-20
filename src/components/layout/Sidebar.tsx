"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
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
  { title: "HR", href: "/hr", icon: UserCog },
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
  const { data: session, status } = useSession()
  const [collapsed, setCollapsed] = useState(false)
  const [brandName, setBrandName] = useState("Admin Portal")
  const [brandSubtitle, setBrandSubtitle] = useState("Si-Ware Systems")
  const [administrationExpanded, setAdministrationExpanded] = useState(
    pathname.startsWith("/admin/all-requests") || pathname.startsWith("/tasks") || pathname.startsWith("/feedback-reports")
  )
  const [adminExpanded, setAdminExpanded] = useState(
    pathname.startsWith("/admin") && pathname !== "/admin/all-requests"
  )
  const [shippingExpanded, setShippingExpanded] = useState(pathname.startsWith("/shipping"))

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
            } else if (isAdministration) {
              expanded = administrationExpanded
              setExpandedFn = (val) => setAdministrationExpanded(val)
              active = pathname.startsWith("/admin/all-requests") || pathname.startsWith("/tasks") || pathname.startsWith("/feedback-reports") || pathname === "/dashboard"
            }

            return (
              <div key={item.title}>
                <button
                  onClick={() => !collapsed && setExpandedFn(!expanded)}
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
