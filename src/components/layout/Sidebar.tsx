"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
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
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "All Requests", href: "/admin/all-requests", icon: ClipboardList },
  { title: "My Requests", href: "/requests", icon: FileText },
  { title: "HR", href: "/hr", icon: UserCog },
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
    ],
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const { data: session, status } = useSession()
  const [collapsed, setCollapsed] = useState(false)
  const [adminExpanded, setAdminExpanded] = useState(pathname.startsWith("/admin"))
  const [shippingExpanded, setShippingExpanded] = useState(pathname.startsWith("/shipping"))
  const permissions = session?.user?.permissions ?? []
  const role = session?.user?.role

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

  const isActive = (href: string) =>
    href === "/dashboard" || href === "/admin/all-requests"
      ? pathname === href
      : pathname.startsWith(href)

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
            Admin Portal
          </span>
          <p className="text-xs text-slate-400 mt-0.5">Si-Ware Systems</p>
        </div>
      </Link>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 space-y-0.5 px-2">
        {visibleNavItems.map((item) => {
          if (item.children) {
            const isAdmin = item.title === "Admin"
            const isShipping = item.title === "Shipping"
            const expanded = isAdmin ? adminExpanded : shippingExpanded
            const setExpanded = isAdmin ? setAdminExpanded : setShippingExpanded

            const active = isAdmin
              ? pathname.startsWith("/admin") && pathname !== "/admin/all-requests"
              : pathname.startsWith("/shipping") && pathname !== "/shipping"

            return (
              <div key={item.title}>
                <button
                  onClick={() => !collapsed && setExpanded(!expanded)}
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
                      const childActive = pathname === child.href
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
                          <span>{child.title}</span>
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
