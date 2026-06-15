"use client"

import { useState, useEffect, useRef } from "react"
import { useSession } from "next-auth/react"
import { User, Mail, Shield, Calendar, Building2, Save, CheckCircle2, Camera, Upload, Trash2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

function getInitials(name?: string | null, email?: string | null) {
  const label = name || email || "U"
  return label.split(/[.\s@_-]+/).filter(Boolean).map((p) => p[0]).join("").toUpperCase().slice(0, 2)
}

const ROLE_COLORS: Record<string, string> = {
  "Full Access":         "bg-purple-100 text-purple-700 border-purple-200",
  "Administration Team": "bg-blue-100 text-blue-700 border-blue-200",
  "People Team":         "bg-indigo-100 text-indigo-700 border-indigo-200",
  "Requester":           "bg-green-100 text-green-700 border-green-200",
  "Viewer":              "bg-gray-100 text-gray-700 border-gray-200",
}

export default function ProfilePage() {
  const { data: session, status, update } = useSession()
  const user = session?.user

  const [name, setName] = useState("")
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState("")
  const [avatarSrc, setAvatarSrc] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (user?.name) setName(user.name)
    setAvatarSrc(user?.image ?? null)
  }, [user?.name, user?.image])

  async function persistImage(image: string | null) {
    if (!user?.id) return
    setError("")
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Failed to save photo")
      }
      await update()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save photo")
    }
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      setError("Image must be smaller than 2 MB.")
      return
    }
    const reader = new FileReader()
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string
      setAvatarSrc(dataUrl)
      void persistImage(dataUrl)
    }
    reader.readAsDataURL(file)
    // reset input so same file can be re-selected
    e.target.value = ""
  }

  const handleRemoveAvatar = () => {
    setAvatarSrc(null)
    void persistImage(null)
  }

  const handleSave = async () => {
    if (!name.trim() || !user?.id) return
    setSaving(true)
    setError("")
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Failed to save")
      }
      // Trigger NextAuth to re-run the jwt + session callbacks so the new name
      // shows in the topbar and elsewhere without requiring a full re-login.
      await update()
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save changes")
    } finally {
      setSaving(false)
    }
  }

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  const roleColor = ROLE_COLORS[user?.role ?? ""] ?? "bg-slate-100 text-slate-700 border-slate-200"
  const hasCustomAvatar = !!avatarSrc

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
        <p className="text-sm text-gray-500 mt-1">View and update your personal information.</p>
      </div>

      {/* Identity card with avatar upload */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-6">
            {/* Avatar with change overlay */}
            <div className="relative group shrink-0">
              <Avatar className="h-20 w-20">
                {avatarSrc
                  ? <AvatarImage src={avatarSrc} alt={user?.name ?? "User"} />
                  : null
                }
                <AvatarFallback className="bg-blue-600 text-white text-2xl font-semibold">
                  {getInitials(user?.name, user?.email)}
                </AvatarFallback>
              </Avatar>
              {/* Hover overlay */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                title="Change photo"
              >
                <Camera className="h-5 w-5 text-white" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/gif,image/webp"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>

            <div className="space-y-2 flex-1">
              <div>
                <p className="text-xl font-semibold text-gray-900">{user?.name || "—"}</p>
                <p className="text-sm text-gray-500">{user?.email}</p>
                <Badge className={`text-xs border mt-1 ${roleColor}`}>{user?.role ?? "User"}</Badge>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs h-7"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-3 w-3" />
                  Change Photo
                </Button>
                {hasCustomAvatar && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 text-xs h-7 text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={handleRemoveAvatar}
                  >
                    <Trash2 className="h-3 w-3" />
                    Remove
                  </Button>
                )}
                <p className="text-xs text-gray-400">JPG, PNG or GIF · max 2 MB</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit form */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <User className="h-4 w-4 text-blue-600" />
            Personal Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <Label htmlFor="display-name">Display Name</Label>
              <Input
                id="display-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email Address</Label>
              <Input id="email" value={user?.email ?? ""} disabled className="bg-gray-50 text-gray-500" />
              <p className="text-xs text-gray-400">Email cannot be changed here.</p>
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex items-center gap-3 pt-1">
            <Button onClick={handleSave} disabled={saving || !name.trim() || name.trim() === user?.name} className="gap-2">
              {saved ? <CheckCircle2 className="h-4 w-4" /> : <Save className="h-4 w-4" />}
              {saving ? "Saving..." : saved ? "Saved!" : "Save Changes"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Account info (read-only) */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Shield className="h-4 w-4 text-blue-600" />
            Account Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100">
              <div className="h-9 w-9 rounded-lg bg-white border border-gray-200 flex items-center justify-center">
                <Mail className="h-4 w-4 text-gray-500" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">Email</p>
                <p className="text-sm font-medium text-gray-900 truncate max-w-[200px]">{user?.email ?? "—"}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100">
              <div className="h-9 w-9 rounded-lg bg-white border border-gray-200 flex items-center justify-center">
                <Shield className="h-4 w-4 text-gray-500" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">Role</p>
                <p className="text-sm font-medium text-gray-900">{user?.role ?? "—"}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100">
              <div className="h-9 w-9 rounded-lg bg-white border border-gray-200 flex items-center justify-center">
                <Building2 className="h-4 w-4 text-gray-500" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">Organization</p>
                <p className="text-sm font-medium text-gray-900">Si-Ware Systems</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100">
              <div className="h-9 w-9 rounded-lg bg-white border border-gray-200 flex items-center justify-center">
                <Calendar className="h-4 w-4 text-gray-500" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">Account ID</p>
                <p className="text-sm font-medium text-gray-900 font-mono text-xs">{user?.id ?? "—"}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
