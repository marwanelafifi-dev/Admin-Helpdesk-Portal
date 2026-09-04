"use client"

import { signOut, useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { LogOut, Settings, Sun, Moon, User } from "lucide-react"
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
  const { theme, setTheme } = useTheme()

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
        title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        className="text-muted-foreground hover:text-foreground"
      >
        {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      </Button>

      {/* User Avatar + Name */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 rounded-md px-1.5 sm:px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
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

      {/* Standalone logout icon */}
      <Button
        variant="ghost"
        size="icon"
        title="Log out"
        className="text-muted-foreground hover:text-destructive hover:bg-red-50 dark:hover:bg-red-950"
        onClick={handleSignOut}
      >
        <LogOut className="h-5 w-5" />
      </Button>
    </div>
  )
}
