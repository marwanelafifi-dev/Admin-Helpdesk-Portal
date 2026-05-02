'use client'

import { useEffect, useState } from 'react'
import { Shield, Plus, Save } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

interface RolePermission {
  id: string
  role: string
  permission: string
  allowed: boolean
}

const ROLES = ['super_admin', 'admin', 'manager', 'employee', 'external']

const PERMISSIONS = [
  'view_dashboard',
  'view_requests',
  'create_request',
  'approve_request',
  'reject_request',
  'delete_request',
  'manage_users',
  'manage_roles',
  'view_audit_log',
  'send_notifications',
]

export default function AdminRolesPage() {
  const [permissions, setPermissions] = useState<RolePermission[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [changes, setChanges] = useState<Record<string, Record<string, boolean>>>({})

  useEffect(() => {
    loadPermissions()
  }, [])

  async function loadPermissions() {
    setIsLoading(true)
    try {
      const response = await fetch('/api/roles')
      const data = await response.json()

      // Flatten grouped data
      const grouped = data as Record<string, RolePermission[]>
      const flattened: RolePermission[] = []

      Object.entries(grouped).forEach(([, perms]) => {
        perms.forEach((perm) => {
          flattened.push(perm)
        })
      })

      setPermissions(flattened)
    } catch (error) {
      console.error('Failed to load permissions:', error)
    }
    setIsLoading(false)
  }

  async function handleTogglePermission(role: string, permission: string) {
    if (!changes[role]) {
      changes[role] = {}
    }

    const current = permissions.find((p) => p.role === role && p.permission === permission)
    const newValue = !(changes[role][permission] ?? current?.allowed ?? false)

    changes[role][permission] = newValue
    setChanges({ ...changes })
  }

  async function handleSaveChanges() {
    setIsSaving(true)
    try {
      for (const role of Object.keys(changes)) {
        for (const permission of Object.keys(changes[role])) {
          const allowed = changes[role][permission]
          await fetch('/api/roles', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role, permission, allowed }),
          })
        }
      }
      setChanges({})
      await loadPermissions()
      alert('Permissions updated successfully!')
    } catch (error) {
      console.error('Failed to save permissions:', error)
      alert('Failed to save permissions')
    }
    setIsSaving(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Roles & Permissions</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Manage role-based access control across the platform
          </p>
        </div>
        <Button
          onClick={handleSaveChanges}
          disabled={isSaving || Object.keys(changes).length === 0}
        >
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Permission Matrix</CardTitle>
          <CardDescription>
            Configure what each role can do in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center text-muted-foreground">Loading permissions...</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-32">Permission</TableHead>
                    {ROLES.map((role) => (
                      <TableHead key={role} className="text-center w-24">
                        <div className="text-xs uppercase font-semibold break-words">
                          {role}
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {PERMISSIONS.map((permission) => (
                    <TableRow key={permission}>
                      <TableCell className="font-medium text-sm">
                        {permission.replace(/_/g, ' ')}
                      </TableCell>
                      {ROLES.map((role) => {
                        const perm = permissions.find(
                          (p) => p.role === role && p.permission === permission
                        )
                        const isAllowed =
                          changes[role]?.[permission] ?? perm?.allowed ?? false

                        return (
                          <TableCell
                            key={`${role}-${permission}`}
                            className="text-center"
                          >
                            <input
                              type="checkbox"
                              checked={isAllowed}
                              onChange={() =>
                                handleTogglePermission(role, permission)
                              }
                              className="h-4 w-4 cursor-pointer"
                            />
                          </TableCell>
                        )
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
