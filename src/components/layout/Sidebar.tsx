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
  Building2,
  BarChart3,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface NavItem {
  title: string
  href: string
  icon: React.ElementType
  roles?: readonly string[]
  children?: (Omit<NavItem, "children">)[]
}

const navItems: NavItem[] = [
  { title: "Dashboard",    href: "/dashboard",          icon: LayoutDashboard, roles: ["super_admin", "admin", "manager"] },
  { title: "All Requests", href: "/admin/all-requests", icon: ClipboardList,   roles: ["super_admin", "admin", "manager"] },
  { title: "Analytics",    href: "/analytics",          icon: BarChart3,       roles: ["super_admin", "admin", "manager"] },
  { title: "My Requests",  href: "/requests",           icon: FileText },
  { title: "HR",           href: "/hr",                 icon: UserCog,         roles: ["super_admin", "admin", "manager"] },
  {
    title: "Shipping",
    href: "/shipping",
    icon: Package,
    children: [
      { title: "Receiving", href: "/shipping/receiving", icon: Package },
      { title: "Sending",   href: "/shipping/sending",   icon: Package },
    ],
  },
  { title: "Maintenance", href: "/maintenance", icon: Wrench },
  { title: "Purchase",    href: "/purchase",    icon: ShoppingCart },
  { title: "Event",       href: "/event",       icon: CalendarDays },
  { title: "Travel",      href: "/travel",      icon: Plane },
  {
    title: "Admin",
    href: "/admin",
    icon: Settings,
    roles: ["super_admin", "manager"],
    children: [
      { title: "Users",    href: "/admin/users",    icon: Users,    roles: ["super_admin", "manager"] },
      { title: "Roles",    href: "/admin/roles",    icon: Shield,   roles: ["super_admin", "manager"] },
      { title: "Settings", href: "/admin/settings", icon: Settings, roles: ["super_admin", "manager"] },
    ],
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const role = session?.user?.role as string | undefined

  const [collapsed, setCollapsed] = useState(false)
  const [adminExpanded, setAdminExpanded] = useState(pathname.startsWith("/admin"))
  const [shippingExpanded, setShippingExpanded] = useState(pathname.startsWith("/shipping"))

  function canSee(item: { roles?: readonly string[] }): boolean {
    if (!item.roles) return true
    if (!role) return false
    return item.roles.includes(role)
  }

  const isActive = (href: string) =>
    href === "/dashboard" || href === "/admin/all-requests"
      ? pathname === href
      : pathname.startsWith(href)

  return (
    <aside
      className={cn(
        "relative flex flex-col border-r border-white/10 bg-slate-900/95 text-white shadow-[18px_0_50px_-28px_rgba(15,23,42,0.8)] backdrop-blur-xl transition-all duration-300 ease-in-out flex-shrink-0",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          "flex items-center gap-3 border-b border-slate-700/80 py-5",
          collapsed ? "justify-center px-0" : "px-5"
        )}
      >
        <Building2 className="h-6 w-6 text-blue-400 drop-shadow-[0_6px_18px_rgba(96,165,250,0.45)] flex-shrink-0" />
        {!collapsed && (
          <div className="overflow-hidden">
            <span className="font-bold text-base tracking-tight whitespace-nowrap">AdminPortal</span>
            <p className="text-xs text-slate-400 mt-0.5">SI-Ware</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 space-y-1 px-2 stagger-children">
        {navItems.filter(canSee).map((item) => {
          if (item.children) {
            const isAdmin    = item.title === "Admin"
            const expanded    = isAdmin ? adminExpanded : shippingExpanded
            const setExpanded = isAdmin ? setAdminExpanded : setShippingExpanded

            const active = isAdmin
              ? pathname.startsWith("/admin") && pathname !== "/admin/all-requests"
              : pathname.startsWith("/shipping") && pathname !== "/shipping"

            const visibleChildren = item.children.filter(canSee)

            return (
              <div key={item.title} className="animate-slide-left">
                <button
                  onClick={() => !collapsed && setExpanded(!expanded)}
                  title={collapsed ? item.title : undefined}
                  className={cn(
                    "interactive-lift w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                    active
                      ? "bg-blue-600 text-white shadow-[0_14px_30px_-18px_rgba(59,130,246,0.8)]"
                      : "text-slate-300 hover:bg-slate-800/90 hover:text-white"
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
                  <div className="ml-3 mt-1 space-y-1 border-l border-slate-700/80 pl-3">
                    {visibleChildren.map((child) => (
                      <Link
                        key={child.title}
                        href={child.href}
                        className={cn(
                          "interactive-lift flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200",
                          pathname === child.href
                            ? "bg-blue-600 text-white shadow-[0_14px_30px_-18px_rgba(59,130,246,0.8)]"
                            : "text-slate-400 hover:bg-slate-800/90 hover:text-white"
                        )}
                      >
                        <child.icon className="h-4 w-4 flex-shrink-0" />
                        <span>{child.title}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )
          }

          return (
            <Link
              key={item.title}
              href={item.href}
              title={collapsed ? item.title : undefined}
              className={cn(
                "animate-slide-left interactive-lift flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                collapsed && "justify-center",
                isActive(item.href)
                  ? "bg-blue-600 text-white shadow-[0_14px_30px_-18px_rgba(59,130,246,0.8)]"
                  : "text-slate-300 hover:bg-slate-800/90 hover:text-white"
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
          className="interactive-lift w-full flex items-center justify-center p-2 rounded-xl text-slate-400 hover:bg-slate-800/90 hover:text-white transition-all duration-200"
        >
          {collapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
        </button>
      </div>
    </aside>
  )
}
