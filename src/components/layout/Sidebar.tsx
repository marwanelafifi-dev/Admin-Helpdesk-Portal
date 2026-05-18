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
} from "lucide-react"
import { cn } from "@/lib/utils"
import { canAccessPath } from "@/lib/access"

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
  const [hasNewRequests, setHasNewRequests] = useState(false)
  const [hasNewTasks, setHasNewTasks] = useState(false)

  const permissions = session?.user?.permissions ?? []
  const role = session?.user?.role

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

  // Check for new requests and tasks
  useEffect(() => {
    if (typeof window !== "undefined") {
      const requestsData = localStorage.getItem("admin_requests")
      const tasksData = localStorage.getItem("admin_tasks")

      if (requestsData) {
        try {
          const requests = JSON.parse(requestsData)
          const newRequests = requests.filter((r: any) => r.status === "new")
          setHasNewRequests(newRequests.length > 0)
        } catch (e) {
          setHasNewRequests(false)
        }
      }

      if (tasksData) {
        try {
          const tasks = JSON.parse(tasksData)
          const newTasks = tasks.filter((t: any) => t.status === "todo")
          setHasNewTasks(newTasks.length > 0)
        } catch (e) {
          setHasNewTasks(false)
        }
      }
    }
  }, [pathname])

  const canSee = (href: string) => status === "authenticated" && canAccessPath(href, permissions, role)

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
        "relative flex flex-col bg-slate-900 text-white transition-all duration-300 ease-in-out flex-shrink-0",
        collapsed ? "w-16" : "w-64"
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
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                    active
                      ? "bg-blue-600 text-white"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  )}
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left">{item.title}</span>
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
                      let childActive = false
                      let showAlert = false

                      if (isAdministration) {
                        childActive = pathname === child.href
                        // Show alert for Team Tasks if new tasks exist
                        if (child.title === "Team Tasks" && hasNewTasks) {
                          showAlert = true
                        }
                        // Show alert for All Requests if new requests exist
                        if (child.title === "All Requests" && hasNewRequests) {
                          showAlert = true
                        }
                      } else {
                        childActive = pathname === child.href
                      }

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
                          <span className="flex-1">{child.title}</span>
                          {showAlert && (
                            <AlertCircle className={cn(
                              "h-4 w-4 flex-shrink-0 animate-pulse",
                              childActive ? "text-white" : "text-red-500"
                            )} />
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
                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                collapsed && "justify-center",
                active
                  ? "bg-blue-600 text-white"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              )}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {!collapsed && <span>{item.title}</span>}
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
