"use client"

import { useEffect, useState } from "react"
import { Bell, Save, AlertCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  getPreferences,
  updatePreferences,
  type NotificationPreferences,
} from "@/services/notificationService"

const ROLE_DESCRIPTIONS: Record<string, string> = {
  "Super Admin": "Full access to all notifications",
  Admin: "Module-specific and team notifications",
  Manager: "Team requests and approvals",
  Requester: "Own requests and status updates",
  Viewer: "Read-only access and updates",
}

export default function NotificationsPage() {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  const userId = "USR-001"
  const userRole = "Requester"

  useEffect(() => {
    setLoading(true)
    const prefs = getPreferences(userId)
    setPreferences(prefs)
    setLoading(false)
  }, [])

  const handleToggle = (key: keyof Omit<NotificationPreferences, 'userId' | 'role'>) => {
    if (!preferences) return
    const updated = { ...preferences, [key]: !preferences[key] }
    setPreferences(updated)
    setSaved(false)
  }

  const handleSave = () => {
    if (preferences) {
      updatePreferences(preferences)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }
  }

  if (loading || !preferences) {
    return <div className="text-center py-10 text-gray-500">Loading notification preferences...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notification Settings</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Manage how and when you receive notifications
          </p>
        </div>
        <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
          <Bell className="h-6 w-6 text-blue-600" />
        </div>
      </div>

      <Card className="border-l-4 border-l-blue-600 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0" />
            <div>
              <p className="font-medium text-blue-900">Your Role: {preferences.role}</p>
              <p className="text-sm text-blue-700">{ROLE_DESCRIPTIONS[preferences.role] || "Standard user"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Types
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="border-b pb-6 last:border-b-0">
            <label className="flex items-center gap-3 cursor-pointer">
              <Checkbox
                checked={preferences.statusChanges}
                onCheckedChange={() => handleToggle('statusChanges')}
              />
              <div>
                <p className="font-medium text-gray-900">Status Changes</p>
                <p className="text-sm text-gray-600">Get notified when request status changes</p>
              </div>
            </label>
          </div>

          <div className="border-b pb-6 last:border-b-0">
            <label className="flex items-center gap-3 cursor-pointer">
              <Checkbox
                checked={preferences.pendingApprovals}
                onCheckedChange={() => handleToggle('pendingApprovals')}
                disabled={preferences.role === "Requester" || preferences.role === "Viewer"}
              />
              <div>
                <p className="font-medium text-gray-900">Pending Approvals</p>
                <p className="text-sm text-gray-600">
                  {preferences.role === "Requester" || preferences.role === "Viewer"
                    ? "Not available for your role"
                    : "Get notified of requests awaiting your approval"}
                </p>
              </div>
            </label>
          </div>

          <div className="border-b pb-6 last:border-b-0">
            <label className="flex items-center gap-3 cursor-pointer">
              <Checkbox
                checked={preferences.comments}
                onCheckedChange={() => handleToggle('comments')}
              />
              <div>
                <p className="font-medium text-gray-900">Comments & Activity</p>
                <p className="text-sm text-gray-600">Get notified when someone comments on your requests</p>
              </div>
            </label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Delivery Method</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-6 w-6 rounded bg-green-100 flex items-center justify-center">
              <span className="text-sm font-semibold text-green-600">✓</span>
            </div>
            <div>
              <p className="font-medium text-gray-900">In-App Notifications</p>
              <p className="text-sm text-gray-600">Enabled — You'll see notifications in the app</p>
            </div>
          </div>

          <div className="border-t pt-4 mt-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <Checkbox
                checked={preferences.emailNotifications}
                onCheckedChange={() => handleToggle('emailNotifications')}
              />
              <div>
                <p className="font-medium text-gray-900">Email Notifications</p>
                <p className="text-sm text-gray-600">Send notifications to your registered email</p>
              </div>
            </label>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button onClick={handleSave} className="gap-2">
          <Save className="h-4 w-4" />
          Save Preferences
        </Button>
        {saved && <p className="text-sm text-green-600 font-medium">✓ Saved successfully</p>}
      </div>
    </div>
  )
}
