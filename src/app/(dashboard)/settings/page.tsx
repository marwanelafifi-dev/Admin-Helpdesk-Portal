"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { useRouter } from "next/navigation"

export default function SettingsPage() {
  const router = useRouter()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-gray-600 mt-2">Manage your account preferences</p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Preferences</CardTitle>
            <CardDescription>Customize your experience</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-base font-medium">Theme</Label>
              <p className="text-sm text-gray-600 mt-1">Currently using system theme</p>
            </div>
            <div>
              <Label className="text-base font-medium">Notifications</Label>
              <p className="text-sm text-gray-600 mt-1">Manage your notification preferences</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Admin Panel</CardTitle>
            <CardDescription>Access administrator features</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push("/admin/users")}>
              Manage Users
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
