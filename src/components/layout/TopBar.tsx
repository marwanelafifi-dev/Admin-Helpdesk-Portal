"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { signOut, useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Bell, LogOut, Menu, Settings, Sun, Moon, User } from "lucide-react"
import { useMobileNav } from "./MobileNavContext"
import { useTheme } from "next-themes"
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
import { markNotificationAsRead } from "@/lib/notificationStore"

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

export function TopBar() {
  const { toggle: toggleMobileNav } = useMobileNav()
  const { data: session } = useSession()
  const router = useRouter()
  const user = session?.user
  const userId = user?.id
  const { notifications, unreadCount } = useNotifications(userId)
  useAnnouncementNotifications(userId)
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

  function handleNotificationClick(actionUrl?: string) {
    setIsOpen(false)
    if (actionUrl) router.push(actionUrl)
  }

  return (
    <header className="h-16 border-b bg-background flex items-center justify-between px-3 sm:px-4 lg:px-6 flex-shrink-0 gap-2">
      {/* Left: hamburger — opens the drawer on mobile, collapses/expands
          the sidebar on desktop (via the arp:toggle-sidebar event). */}
      <div className="flex items-center flex-shrink-0">
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
          className="text-muted-foreground hover:text-foreground"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      {/* Center: Logo (hidden on very small screens to save room) */}
      {headerShowLogo ? (
        <div className="flex-1 flex items-center justify-center min-w-0">
          <div className="relative h-10 w-40 sm:h-12 sm:w-56 lg:w-64">
            {logoSrc.startsWith("data:") ? (
              <img src={logoSrc} alt={headerLogoAlt} className="h-full w-full object-contain" />
            ) : (
              <Image src={logoSrc} alt={headerLogoAlt} fill className="object-contain" priority />
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1" />
      )}

      {/* Right: actions */}
      <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="icon"
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="text-muted-foreground hover:text-foreground"
        >
          {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>

        {/* Notification Bell */}
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5 text-slate-600" />
              {unreadCount > 0 ? (
                <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              ) : null}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-sm font-semibold text-gray-900">Notifications</span>
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
                  onClick={() => handleNotificationClick(notification.actionUrl)}
                >
                  <span className="text-sm font-medium leading-snug">{notification.title}</span>
                  <span className="text-xs text-muted-foreground">{notification.description}</span>
                </DropdownMenuItem>
              ))
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-center text-sm text-blue-600 cursor-pointer justify-center font-medium hover:bg-blue-50 hover:text-blue-700"
              onClick={() => { setIsOpen(false); router.push("/notifications") }}
            >
              View all notifications
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Avatar + Name */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-md px-1.5 sm:px-2 py-1.5 hover:bg-gray-100 transition-colors">
              <Avatar className="h-8 w-8">
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
              onClick={() => signOut({ callbackUrl: "/login" })}
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
          className="text-muted-foreground hover:text-destructive hover:bg-red-50"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          <LogOut className="h-5 w-5" />
        </Button>
      </div>
    </header>
  )
}
