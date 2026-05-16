"use client"

import { useEffect, useState } from "react"
import { Bell, Shield, Globe, Power } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function AdminSettingsPage() {
  const [maintenanceEnabled, setMaintenanceEnabled] = useState(false)
  const [maintenanceSource, setMaintenanceSource] = useState<"env" | "runtime">("env")
  const [maintenanceLoading, setMaintenanceLoading] = useState(true)
  const [maintenanceSaving, setMaintenanceSaving] = useState(false)

  useEffect(() => {
    async function loadMaintenanceMode() {
      try {
        const response = await fetch("/api/admin/settings/maintenance")
        if (!response.ok) return
        const data = await response.json() as { enabled: boolean; source: "env" | "runtime" }
        setMaintenanceEnabled(data.enabled)
        setMaintenanceSource(data.source)
      } finally {
        setMaintenanceLoading(false)
      }
    }

    void loadMaintenanceMode()
  }, [])

  async function handleMaintenanceToggle() {
    setMaintenanceSaving(true)
    try {
      const response = await fetch("/api/admin/settings/maintenance", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !maintenanceEnabled }),
      })

      if (!response.ok) return

      const data = await response.json() as { enabled: boolean; source: "env" | "runtime" }
      setMaintenanceEnabled(data.enabled)
      setMaintenanceSource(data.source)
    } finally {
      setMaintenanceSaving(false)
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Platform-wide configuration and preferences
        </p>
      </div>

      {/* General */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base">General</CardTitle>
          </div>
          <CardDescription>Basic platform information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="platform-name">Platform Name</Label>
            <Input id="platform-name" defaultValue="Admin Request Platform" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="org-name">Organization Name</Label>
            <Input id="org-name" defaultValue="SI-Ware" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="support-email">Support Email</Label>
            <Input id="support-email" type="email" defaultValue="support@si-ware.com" />
          </div>
          <Button>Save changes</Button>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base">Notifications</CardTitle>
          </div>
          <CardDescription>Configure email and in-app notification preferences</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
            <Bell className="h-10 w-10 mb-3 text-slate-300" />
            <p className="font-medium text-sm">Notification settings coming soon</p>
          </div>
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base">Security</CardTitle>
          </div>
          <CardDescription>Authentication and security policies</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
            <Shield className="h-10 w-10 mb-3 text-slate-300" />
            <p className="font-medium text-sm">Security settings coming soon</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Power className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base">Maintenance Mode</CardTitle>
          </div>
          <CardDescription>
            Redirect all non-Super Admin users to the maintenance page.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-4">
            <div>
              <p className="text-sm font-medium text-slate-900">
                Current status: {maintenanceLoading ? "Loading..." : maintenanceEnabled ? "Enabled" : "Disabled"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Source: {maintenanceSource === "env" ? "Environment variable at boot" : "Runtime override for current server process"}
              </p>
            </div>
            <Button
              type="button"
              onClick={handleMaintenanceToggle}
              disabled={maintenanceLoading || maintenanceSaving}
              className={maintenanceEnabled ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"}
            >
              {maintenanceSaving
                ? "Saving..."
                : maintenanceEnabled
                  ? "Disable Maintenance Mode"
                  : "Enable Maintenance Mode"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            This toggle is intended for local testing and single-instance runtime control.
            For durable production maintenance windows, set <code>MAINTENANCE_MODE=true</code> in the environment and restart the app.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
