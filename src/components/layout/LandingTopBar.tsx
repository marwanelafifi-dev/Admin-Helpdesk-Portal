"use client"

import { signOut, useSession } from "next-auth/react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { LogOut, Settings, Sun, Moon, User, MessageSquarePlus } from "lucide-react"
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
import { openPortalFeedback } from "@/components/feedback/PortalFeedbackLauncher"
import { JourneyManual } from "@/components/help/JourneyManual"

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

export function LandingTopBar() {
  const { data: session } = useSession()
  const router = useRouter()
  const user = session?.user
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])
  const isDark = mounted && resolvedTheme === "dark"

  function toggleTheme() {
    const nextTheme = isDark ? "light" : "dark"
    setTheme(nextTheme)
    document.documentElement.classList.toggle("dark", nextTheme === "dark")
    document.documentElement.style.colorScheme = nextTheme
  }

  async function handleSignOut() {
    await signOut({ redirect: false })
    window.location.assign("/login")
  }

  return (
    <div className="flex items-center gap-1 sm:gap-2">
      {/* Theme toggle */}
      <Button
        variant="ghost"
        size="icon"
        title={isDark ? "Switch to light mode" : "Switch to dark mode"}
        onClick={toggleTheme}
        className="order-1 text-muted-foreground hover:text-foreground dark:text-slate-300 dark:hover:bg-sky-400/10 dark:hover:text-cyan-200"
      >
        {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      </Button>
      <Button variant="ghost" size="icon" title="Portal feedback" aria-label="Share portal feedback" onClick={openPortalFeedback} className="order-2 text-muted-foreground hover:text-blue-600 dark:text-slate-300 dark:hover:bg-sky-400/10 dark:hover:text-cyan-200">
        <MessageSquarePlus className="h-5 w-5" />
      </Button>
      <JourneyManual className="order-3" />

      {/* User Avatar + Name */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="order-4 flex items-center gap-2 rounded-lg px-1.5 py-1.5 transition-colors hover:bg-gray-100 dark:hover:bg-sky-400/10 sm:px-2">
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
          <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => router.push("/profile")}>
            <User className="h-4 w-4 text-gray-500" />
            Profile
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => router.push("/account/settings")}>
            <Settings className="h-4 w-4 text-gray-500" />
            Settings
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Button
        variant="ghost"
        size="icon"
        title="Log out"
        aria-label="Log out"
        className="order-5 text-muted-foreground hover:text-destructive hover:bg-red-50 dark:text-slate-300 dark:hover:bg-red-400/10"
        onClick={handleSignOut}
      >
        <LogOut className="h-5 w-5" />
      </Button>

    </div>
  )
}
