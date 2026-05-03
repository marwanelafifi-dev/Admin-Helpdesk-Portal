'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { isReservedRequestPathId } from '@/lib/request-path-guards'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusDropdown, type RequestStatus } from '@/components/ui/status-dropdown'
import Link from 'next/link'

interface RequestDetail {
  id: string
  module: string
  title: string
  status: RequestStatus
  payload: Record<string, unknown>
  requester: { name: string; email: string }
  createdAt: string
  updatedAt: string
}

export default function RequestDetailsPage({
  params,
}: {
  params: Promise<{ module: string; id: string }>
}) {
  const router = useRouter()
  const { data: session } = useSession()
  
  const [resolvedParams, setResolvedParams] = useState<{ module: string; id: string } | null>(null)

  useEffect(() => {
    params.then(setResolvedParams)
  }, [params])

  const [request, setRequest] = useState<RequestDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)

  const isAdmin = session?.user?.role === 'super_admin' || session?.user?.role === 'admin'

  useEffect(() => {
    if (!resolvedParams?.id || !resolvedParams?.module) return

    if (isReservedRequestPathId(resolvedParams.id)) {
      setError(null)
      const m = resolvedParams.module
      if (resolvedParams.id.toLowerCase() === 'new') {
        router.replace(`/${m}/new`)
      } else {
        router.replace(`/${m}`)
      }
      return
    }

    if (!session?.user?.id) return

    const fetchRequest = async () => {
      try {
        setIsLoading(true)
        const response = await fetch(`/api/requests/${resolvedParams.module}/${resolvedParams.id}`, {
          credentials: 'include',
          headers: {
            'x-user-id': session?.user?.id || '',
            'x-user-role': session?.user?.role || '',
          },
        })

        if (!response.ok) {
          throw new Error('Failed to fetch request')
        }

        const data = await response.json()
        setRequest(data.ok ? data.data : data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load request')
      } finally {
        setIsLoading(false)
      }
    }

    fetchRequest()
  }, [resolvedParams, session, router])

  const handleStatusChange = async (newStatus: RequestStatus) => {
    if (!isAdmin || isUpdating || !resolvedParams) return

    setIsUpdating(true)
    try {
      const response = await fetch(`/api/requests/${resolvedParams.module}/${resolvedParams.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': session?.user?.id || '',
          'x-user-role': session?.user?.role || '',
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) {
        throw new Error('Failed to update status')
      }

      setRequest((prev) =>
        prev ? { ...prev, status: newStatus, updatedAt: new Date().toISOString() } : null
      )
    } catch (err) {
      console.error('Error updating status:', err)
      alert('Failed to update status')
    } finally {
      setIsUpdating(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading request...</p>
        </div>
      </div>
    )
  }

  if (error || !request) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-96">
          <CardHeader>
            <CardTitle>Error</CardTitle>
            <CardDescription>{error || 'Request not found'}</CardDescription>
          </CardHeader>
          <CardContent>
            {resolvedParams && (
              <Link href={`/${resolvedParams.module}`}>
                <Button variant="outline" className="w-full">
                  Back to {resolvedParams.module}
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!resolvedParams) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/${resolvedParams.module}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">{request.title}</h1>
            <p className="text-sm text-gray-500">
              Request ID: {request.id} • Module: {resolvedParams.module.toUpperCase()}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status Card */}
          <Card>
            <CardHeader>
              <CardTitle>Request Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isAdmin ? (
                <div className="space-y-2">
                  <p className="text-sm text-gray-600 mb-3">Admin: Update the request status below</p>
                  <StatusDropdown
                    currentStatus={request.status}
                    onStatusChange={handleStatusChange}
                    disabled={isUpdating}
                    adminOnly={true}
                  />
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-lg font-semibold mb-2">Current Status</p>
                  <StatusDropdown
                    currentStatus={request.status}
                    onStatusChange={async () => {}}
                    disabled={true}
                    adminOnly={false}
                  />
                  <p className="text-xs text-gray-500 mt-3">
                    Only admins can change the status
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payload Details */}
          <Card>
            <CardHeader>
              <CardTitle>Request Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium text-gray-500">Created</p>
                    <p className="text-sm">
                      {new Date(request.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500">Last Updated</p>
                    <p className="text-sm">
                      {new Date(request.updatedAt).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <p className="text-xs font-medium text-gray-500 mb-3">Payload Data</p>
                  <pre className="bg-gray-50 p-4 rounded-lg text-xs overflow-auto max-h-96">
                    {JSON.stringify(request.payload, null, 2)}
                  </pre>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Requester Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Requester</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs font-medium text-gray-500">Name</p>
                <p className="text-sm font-medium">{request.requester.name}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">Email</p>
                <p className="text-sm">{request.requester.email}</p>
              </div>
            </CardContent>
          </Card>

          {/* Info Box */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-6">
              <p className="text-xs text-blue-700">
                <strong>Note:</strong> Only Super Admin and Admin users can modify the request
                status. Other users can only view the request details.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
