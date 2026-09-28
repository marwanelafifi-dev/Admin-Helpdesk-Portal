"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { signOut, useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Bell, LogOut, Menu, Settings, Shield, Sun, Moon, User, MessageSquarePlus } from "lucide-react"
import { useMobileNav } from "./MobileNavContext"
import { useTheme } from "next-themes"
import { getFirstAllowedPlatformAdminPath } from "@/lib/access"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useNotifications } from "@/hooks/useNotifications"
import { useAnnouncementNotifications } from "@/hooks/useAnnouncementNotifications"
import { useNotificationSound } from "@/hooks/useNotificationSound"
import { markNotificationAsRead, notificationActionUrl, type StoredNotification } from "@/lib/notificationStore"
import { fmtDateTime } from "@/lib/utils"
import type { FunctionId } from "@/lib/functionRegistry"
import { JourneyManual } from "@/components/help/JourneyManual"
import { openPortalFeedback } from "@/components/feedback/PortalFeedbackLauncher"

function getInitials(name?: string | null, email?: string | null) {
  const label = name || email || "User"
  return label
    .split(/[.\s@_-]+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

function roleLabel(role?: string) {
  return role
    ? role
        .split("_")
        .map((part) => part[0].toUpperCase() + part.slice(1))
        .join(" ")
    : "User"
}

const SETTINGS_KEY = "arp_platform_settings"

type Portal = "admin" | "hr" | "finance" | "platform-admin"

const NOTIFICATION_LABEL: Record<FunctionId, string> = {
  admin: "Administration",
  hr: "HR",
  finance: "Finance",
}

const NOTIFICATION_PAGE: Record<FunctionId, string> = {
  admin: "/notifications",
  hr: "/departments/hr/notifications",
  finance: "/departments/finance/notifications",
}

export function TopBar({ portal = "admin" }: { portal?: Portal }) {
  const { toggle: toggleMobileNav } = useMobileNav()
  const { data: session } = useSession()
  const router = useRouter()
  const user = session?.user
  const userId = user?.id
  const platformAdminPath = getFirstAllowedPlatformAdminPath(user?.permissions, user?.role)
  const notificationFunction: FunctionId | undefined = ["admin", "hr", "finance"].includes(portal)
    ? portal as FunctionId
    : undefined
  const { notifications, unreadCount } = useNotifications(userId, notificationFunction)
  useAnnouncementNotifications(userId, notificationFunction)
  useNotificationSound(unreadCount)
  const { theme, setTheme } = useTheme()
  const [isOpen, setIsOpen] = useState(false)
  const [headerShowLogo, setHeaderShowLogo] = useState(true)
  const [headerLogoAlt, setHeaderLogoAlt] = useState("Si-Ware Systems")
  const [logoSrc, setLogoSrc] = useState("/siware-logo.png")

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY)
      if (raw) {
        const s = JSON.parse(raw)
        if (typeof s.headerShowLogo === "boolean") setHeaderShowLogo(s.headerShowLogo)
        if (s.headerLogoAlt) setHeaderLogoAlt(s.headerLogoAlt)
      }
      const customLogo = localStorage.getItem("arp_logo_header")
      if (customLogo) setLogoSrc(customLogo)
    } catch {}
  }, [])

  useEffect(() => {
    if (!isOpen || !userId) return
    notifications
      .filter((notification) => !notification.read)
      .forEach((notification) => markNotificationAsRead(notification.id))
  }, [isOpen, notifications, userId])

  function handleNotificationClick(notification: StoredNotification) {
    setIsOpen(false)
    const actionUrl = notificationFunction
      ? notificationActionUrl(notification, notificationFunction)
      : notification.actionUrl
    if (actionUrl) router.push(actionUrl)
  }

  async function handleSignOut() {
    await signOut({ redirect: false })
    window.location.assign("/login")
  }

  return (
    <header className="relative flex h-32 shrink-0 items-start justify-between gap-2 border-b border-blue-200 bg-[radial-gradient(ellipse_70%_180%_at_50%_0%,_#cfe8ff_0%,_#dff0ff_30%,_#edf6ff_62%,_#f7fbff_100%)] px-3 shadow-[0_10px_30px_-24px_rgba(30,64,175,0.35)] dark:border-sky-300/20 dark:!bg-[radial-gradient(ellipse_70%_220%_at_50%_0%,_#1b4a76_0%,_#102d4c_44%,_#0a1b30_100%)] dark:shadow-[0_12px_32px_-22px_rgba(0,0,0,0.95)] sm:h-16 sm:items-center sm:px-4 lg:px-6">
      {/* Left: hamburger — opens the drawer on mobile, collapses/expands
          the sidebar on desktop (via the arp:toggle-sidebar event). */}
      <div className="absolute left-3 top-2 flex items-center flex-shrink-0 sm:static">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Toggle menu"
          onClick={() => {
            // <lg: open the slide-in drawer. >=lg: dispatch a toggle event
            // that the Sidebar listens for and uses to flip `collapsed`.
            if (typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches) {
              window.dispatchEvent(new Event("arp:toggle-sidebar"))
            } else {
              toggleMobileNav()
            }
          }}
          className="text-slate-500 transition-colors hover:bg-white/80 hover:text-[#173f91] hover:shadow-sm dark:text-slate-300 dark:hover:bg-sky-400/10 dark:hover:text-cyan-200"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      {/* Center: Logo (hidden on very small screens to save room) */}
      {headerShowLogo ? (
        <Link href="/landing" title="Return to Company Portal home" aria-label="Return to Company Portal home" className="absolute bottom-2 left-1/2 flex min-w-0 -translate-x-1/2 items-center justify-center rounded-lg transition-opacity hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-cyan-300 dark:focus-visible:ring-offset-[#0a1b30] sm:bottom-auto">
          <div className="relative h-12 w-48 sm:w-56 lg:w-64">
            {logoSrc.startsWith("data:") ? (
              <img src={logoSrc} alt={headerLogoAlt} className="h-full w-full object-contain dark:brightness-0 dark:invert" />
            ) : (
              <Image src={logoSrc} alt={headerLogoAlt} fill className="object-contain dark:brightness-0 dark:invert" priority />
            )}
          </div>
        </Link>
      ) : (
        <div className="flex-1" />
      )}

      {/* Right: actions */}
      <div className="absolute right-2 top-2 flex items-center gap-0.5 sm:static sm:gap-2 flex-shrink-0">
        {platformAdminPath && (
          <Button
            variant="ghost"
            size="icon"
            title="Platform Administration"
            aria-label="Open platform administration"
            onClick={() => router.push(platformAdminPath)}
            className="text-slate-500 transition-colors hover:bg-white/80 hover:text-[#173f91] hover:shadow-sm dark:text-slate-300 dark:hover:bg-sky-400/10 dark:hover:text-cyan-200"
          >
            <Shield className="h-5 w-5" />
          </Button>
        )}
        {/* Platform Admin — global superadmin tools, independent of any
            business function's portal. Only shown to users who can reach
            at least one of those pages. */}
        {/* Notification Bell */}
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative text-slate-500 transition-colors hover:bg-white/80 hover:text-[#173f91] hover:shadow-sm dark:text-slate-300 dark:hover:bg-sky-400/10 dark:hover:text-cyan-200" aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}>
              <Bell className="h-5 w-5" />
              {unreadCount > 0 ? (
                <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              ) : null}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-sm font-semibold text-gray-900">
                {notificationFunction ? `${NOTIFICATION_LABEL[notificationFunction]} Notifications` : "Notifications"}
              </span>
              <button
                onClick={() => { setIsOpen(false); router.push("/notifications/settings") }}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
                title="Notification settings"
              >
                <Settings className="h-3.5 w-3.5" />
                Settings
              </button>
            </div>
            <DropdownMenuSeparator />
            {notifications.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-slate-500">
                No notifications yet.
              </div>
            ) : (
              notifications.slice(0, 6).map((notification) => (
                <DropdownMenuItem
                  key={notification.id}
                  className="flex flex-col items-start gap-0.5 cursor-pointer hover:bg-blue-50"
                  onClick={() => handleNotificationClick(notification)}
                >
                  <span className="text-sm font-medium leading-snug">{notification.title}</span>
                  <span className="text-xs text-muted-foreground">{notification.description}</span>
                  <time
                    dateTime={notification.createdAt}
                    className="mt-1 text-[10px] text-gray-400 tabular-nums"
                  >
                    {fmtDateTime(notification.createdAt)}
                  </time>
                </DropdownMenuItem>
              ))
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-center text-sm text-blue-600 cursor-pointer justify-center font-medium hover:bg-blue-50 hover:text-blue-700"
              onClick={() => {
                setIsOpen(false)
                router.push(notificationFunction ? NOTIFICATION_PAGE[notificationFunction] : "/notifications")
              }}
            >
              View all notifications
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="icon"
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="text-slate-500 transition-colors hover:bg-white/80 hover:text-[#173f91] hover:shadow-sm dark:text-slate-300 dark:hover:bg-sky-400/10 dark:hover:text-cyan-200"
        >
          {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>

        <Button variant="ghost" size="icon" title="Portal feedback" aria-label="Share portal feedback" onClick={openPortalFeedback} className="text-slate-500 transition-colors hover:bg-white/80 hover:text-blue-600 hover:shadow-sm dark:text-slate-300 dark:hover:bg-sky-400/10 dark:hover:text-cyan-200">
          <MessageSquarePlus className="h-5 w-5" />
        </Button>

        <JourneyManual />

        {/* User Avatar + Name */}
        {/* Kept immediately beside the account control so help is visible in every function. */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-lg px-1.5 py-1.5 transition-colors hover:bg-white/80 hover:shadow-sm dark:hover:bg-sky-400/10 sm:px-2">
              <Avatar className="h-8 w-8 dark:ring-2 dark:ring-sky-300/20">
                {user?.image && <AvatarImage src={user.image} alt={user.name ?? "User"} />}
                <AvatarFallback className="bg-blue-600 text-white text-xs font-semibold">
                  {getInitials(user?.name, user?.email)}
                </AvatarFallback>
              </Avatar>
              <div className="hidden lg:block text-left">
                <p className="text-sm font-medium leading-tight">{user?.name ?? user?.email}</p>
                <p className="text-xs text-muted-foreground leading-tight">
                  {roleLabel(user?.role)}
                </p>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer gap-2"
              onClick={() => router.push("/profile")}
            >
              <User className="h-4 w-4 text-gray-500" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer gap-2"
              onClick={() => router.push("/account/settings")}
            >
              <Settings className="h-4 w-4 text-gray-500" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Standalone logout icon */}
        <Button
          variant="ghost"
          size="icon"
          title="Log out"
          className="text-slate-500 transition-colors hover:bg-white/80 hover:text-destructive hover:shadow-sm dark:text-slate-300 dark:hover:bg-red-400/10"
          onClick={handleSignOut}
        >
          <LogOut className="h-5 w-5" />
        </Button>
      </div>
    </header>
  )
}
