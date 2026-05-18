"use client"

import { Bell, LogOut, Sun, Moon } from "lucide-react"
import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
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
import { useCallback, useEffect, useRef, useState } from "react"

interface Notification {
  id: string
  type: string
  title: string
  message: string
  read: boolean
  createdAt: string
  link?: string
}

function dedupeNotifications(items: Notification[]): Notification[] {
  const seen = new Set<string>()
  const output: Notification[] = []
  for (const item of items) {
    if (seen.has(item.id)) continue
    seen.add(item.id)
    output.push(item)
  }
  return output
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return <div className="h-9 w-9" />
  return (
    <Button
      variant="ghost"
      size="icon"
      title={resolvedTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className="text-muted-foreground hover:text-foreground"
    >
      {resolvedTheme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </Button>
  )
}

export function TopBar() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  /** After a 401, do not poll or refetch until session identity changes */
  const notificationsBlockedRef = useRef(false)

  const userId = session?.user?.id

  const name = session?.user?.name ?? "User"
  const email = session?.user?.email ?? ""
  const image = session?.user?.image ?? ""
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  useEffect(() => {
    notificationsBlockedRef.current = false
  }, [userId, status])

  const loadNotifications = useCallback(async () => {
    if (status !== "authenticated" || !userId) return
    if (notificationsBlockedRef.current) return

    setIsLoading(true)
    try {
      const params = new URLSearchParams({ take: "10" })
      const response = await fetch(`/api/notifications?${params}`, {
        credentials: "include",
        cache: "no-store",
        headers: { "x-user-id": userId },
      })

      if (response.status === 401) {
        notificationsBlockedRef.current = true
        return
      }

      if (!response.ok) return

      const result = (await response.json()) as {
        notifications?: Notification[]
      }
      const notificationsList = dedupeNotifications(result.notifications ?? [])
      setNotifications(notificationsList)
      setUnreadCount(notificationsList.filter((n) => !n.read).length)
    } finally {
      setIsLoading(false)
    }
  }, [status, userId])

  useEffect(() => {
    if (status !== "authenticated" || !userId) return

    void loadNotifications()
    const interval = setInterval(() => {
      if (!notificationsBlockedRef.current) void loadNotifications()
    }, 30000)

    return () => clearInterval(interval)
  }, [status, userId, loadNotifications])

  async function handleMarkAsRead(id: string, link?: string) {
    if (status !== "authenticated" || !userId || notificationsBlockedRef.current)
      return

    const response = await fetch(`/api/notifications/${id}`, {
      method: "PATCH",
      credentials: "include",
      cache: "no-store",
      headers: { "x-user-id": userId },
    })

    if (response.status === 401) {
      notificationsBlockedRef.current = true
      return
    }

    if (!response.ok) return

    await loadNotifications()
    if (link) {
      window.location.href = link
    }
  }

  const recentNotifications = notifications.slice(0, 5)
  const displayCount = Math.min(unreadCount, 99)

  return (
    <header className="glass-panel sticky top-0 z-20 h-16 border-b border-border/60 shadow-[0_16px_38px_-30px_rgba(15,23,42,0.45)] dark:shadow-[0_16px_38px_-30px_rgba(0,0,0,0.6)] flex items-center justify-between px-6 flex-shrink-0">
      {/* Left: brand */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground font-medium">
          Admin Request Platform
        </span>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-2">
        {/* Dark mode toggle */}
        <ThemeToggle />

        {/* Notification Bell */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5 text-muted-foreground" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center shadow-[0_10px_24px_-10px_rgba(239,68,68,0.85)]">
                  {displayCount}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel className="flex justify-between">
              <span>Notifications</span>
              {unreadCount > 0 && (
                <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
                  {unreadCount} unread
                </span>
              )}
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            {isLoading ? (
              <DropdownMenuItem disabled>Loading...</DropdownMenuItem>
            ) : recentNotifications.length === 0 ? (
              <DropdownMenuItem disabled>
                <span className="text-xs text-muted-foreground">
                  No notifications yet
                </span>
              </DropdownMenuItem>
            ) : (
              recentNotifications.map((notification) => (
                <DropdownMenuItem
                  key={notification.id}
                  className={`flex flex-col items-start gap-0.5 cursor-pointer p-3 hover:bg-accent transition-colors ${
                    !notification.read ? "bg-primary/5 dark:bg-primary/10" : ""
                  }`}
                  onClick={() =>
                    handleMarkAsRead(notification.id, notification.link)
                  }
                >
                  <span className="text-sm font-medium">
                    {notification.title}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {notification.message}
                  </span>
                  <span className="text-[10px] text-gray-400">
                    {new Date(notification.createdAt).toLocaleString()}
                  </span>
                </DropdownMenuItem>
              ))
            )}

            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-center text-sm text-blue-600 cursor-pointer justify-center"
                onClick={() => router.push("/notifications")}
              >
                View all notifications
              </DropdownMenuItem>
            </>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Avatar + Name */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="interactive-lift flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-accent transition-all duration-200">
              <Avatar className="h-8 w-8">
                {image && <AvatarImage src={image} alt={name} />}
                <AvatarFallback className="bg-blue-600 text-white text-xs font-semibold shadow-[0_12px_24px_-12px_rgba(37,99,235,0.85)]">
                  {initials}
                </AvatarFallback>
              </Avatar>

              <div className="hidden md:block text-left">
                <p className="text-sm font-medium leading-tight">{name}</p>
                <p className="text-xs text-muted-foreground leading-tight">
                  {email}
                </p>
              </div>
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/profile")} className="cursor-pointer">
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/settings")} className="cursor-pointer">
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />

            <DropdownMenuItem
              className="text-destructive focus:text-destructive cursor-pointer"
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
