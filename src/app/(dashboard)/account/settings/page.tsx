"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Lock, Bell, CheckCircle2, Eye, EyeOff, ShieldCheck, ArrowRight } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function AccountSettingsPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const user = session?.user

  const [currentPw, setCurrentPw] = useState("")
  const [newPw, setNewPw] = useState("")
  const [confirmPw, setConfirmPw] = useState("")
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [pwSaving, setPwSaving] = useState(false)
  const [pwSaved, setPwSaved] = useState(false)
  const [pwError, setPwError] = useState("")

  const isGoogleUser = !!(user?.image && !(user?.image ?? "").startsWith("data:"))

  const handlePasswordSave = async () => {
    setPwError("")
    if (!currentPw) { setPwError("Current password is required."); return }
    if (newPw.length < 8) { setPwError("New password must be at least 8 characters."); return }
    if (newPw !== confirmPw) { setPwError("Passwords do not match."); return }

    setPwSaving(true)
    try {
      const res = await fetch(`/api/users/${user?.id}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPw }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Failed to update password")
      }
      setCurrentPw(""); setNewPw(""); setConfirmPw("")
      setPwSaved(true)
      setTimeout(() => setPwSaved(false), 3000)
    } catch (err) {
      setPwError(err instanceof Error ? err.message : "Failed to update password")
    } finally {
      setPwSaving(false)
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Account Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your password and notification preferences.</p>
      </div>

      {/* Change Password */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Lock className="h-4 w-4 text-blue-600" />
            Change Password
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isGoogleUser && (
            <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3">
              <ShieldCheck className="h-4 w-4 text-amber-600 shrink-0" />
              <p className="text-sm text-amber-700">
                Your account uses Google Sign-In. Password changes are managed through your Google account.
              </p>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="current-pw">Current Password</Label>
            <div className="relative">
              <Input
                id="current-pw"
                type={showCurrent ? "text" : "password"}
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
                placeholder="Enter current password"
                className="pr-10"
                disabled={isGoogleUser}
              />
              <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="new-pw">New Password</Label>
              <div className="relative">
                <Input
                  id="new-pw"
                  type={showNew ? "text" : "password"}
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  placeholder="Min. 8 characters"
                  className="pr-10"
                  disabled={isGoogleUser}
                />
                <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm-pw">Confirm New Password</Label>
              <div className="relative">
                <Input
                  id="confirm-pw"
                  type={showConfirm ? "text" : "password"}
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                  placeholder="Repeat new password"
                  className="pr-10"
                  disabled={isGoogleUser}
                />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          {newPw.length > 0 && (
            <div className="space-y-1">
              <div className="flex gap-1">
                {[1,2,3,4].map((level) => (
                  <div key={level} className={`h-1 flex-1 rounded-full transition-colors ${
                    newPw.length >= level * 3
                      ? level <= 1 ? "bg-red-400" : level <= 2 ? "bg-amber-400" : level <= 3 ? "bg-blue-400" : "bg-green-500"
                      : "bg-gray-200"
                  }`} />
                ))}
              </div>
              <p className="text-xs text-gray-400">
                {newPw.length < 8 ? "Too short" : newPw.length < 10 ? "Fair" : newPw.length < 12 ? "Good" : "Strong"}
              </p>
            </div>
          )}

          {pwError && <p className="text-sm text-red-600">{pwError}</p>}

          <div className="pt-1">
            <Button
              onClick={handlePasswordSave}
              disabled={pwSaving || isGoogleUser || !currentPw || !newPw || !confirmPw}
              className="gap-2"
            >
              {pwSaved ? <CheckCircle2 className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
              {pwSaving ? "Updating..." : pwSaved ? "Password Updated!" : "Update Password"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Notification Preferences — link to dedicated page */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Bell className="h-4 w-4 text-blue-600" />
            Notification Preferences
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50 border border-gray-100">
            <div>
              <p className="text-sm font-medium text-gray-900">Manage notification preferences</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Control which events trigger in-app and email notifications.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 shrink-0 ml-4"
              onClick={() => router.push("/notifications/settings")}
            >
              Open Settings
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
