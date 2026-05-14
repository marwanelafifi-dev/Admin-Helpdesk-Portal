"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { signOut, useSession } from "next-auth/react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Bell, LogOut, Settings } from "lucide-react"
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

export function TopBar() {
  const { data: session } = useSession()
  const router = useRouter()
  const user = session?.user
  const userId = user?.id
  const { notifications, unreadCount } = useNotifications(userId)
  const [isOpen, setIsOpen] = useState(false)

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
    <header className="h-16 border-b bg-white flex items-center justify-between px-6 flex-shrink-0">
      {/* Left: Empty space */}
      <div className="flex-1" />

      {/* Center: Logo */}
      <div className="flex items-center justify-center px-4 relative h-12 w-64">
        <Image
          src="/siware-logo.png"
          alt="Si-Ware Systems"
          fill
          className="object-contain"
          priority
        />
      </div>

      {/* Right: Empty space */}
      <div className="flex-1" />

      {/* Right: actions */}
      <div className="flex items-center gap-2">
        {/* Notification Settings Icon */}
        <Link href="/notifications/settings">
          <Button variant="ghost" size="icon" title="Notification settings" className="relative">
            <Settings className="h-4 w-4 text-slate-500" />
          </Button>
        </Link>

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
            <DropdownMenuLabel>Notifications</DropdownMenuLabel>
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
            <button className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-gray-100 transition-colors">
              <Avatar className="h-8 w-8">
                {user?.image && <AvatarImage src={user.image} alt={user.name ?? "User"} />}
                <AvatarFallback className="bg-blue-600 text-white text-xs font-semibold">
                  {getInitials(user?.name, user?.email)}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium leading-tight">{user?.name ?? user?.email}</p>
                <p className="text-xs text-muted-foreground leading-tight">
                  {roleLabel(user?.role)}
                </p>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Profile</DropdownMenuItem>
            <DropdownMenuItem>Settings</DropdownMenuItem>
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
