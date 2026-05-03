/**
 * Client-side API utilities for form submission
 * These functions handle form data submission to the backend API routes
 */

export interface SubmitRequestOptions {
  module: string
  title: string
  payload: unknown
  status?: string
  userId?: string
  userName?: string
}

export interface SubmitRequestResult {
  success: boolean
  requestId?: string
  error?: string
}

/**
 * Submit a request form to the backend
 * Handles JSON serialization, error handling, and response parsing
 */
export async function submitRequest(
  options: SubmitRequestOptions
): Promise<SubmitRequestResult> {
  try {
    const response = await fetch(`/api/requests/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': options.userId || '',
        'x-user-name': options.userName || '',
      },
      body: JSON.stringify({
        module: options.module,
        title: options.title,
        payload: options.payload,
        status: options.status || 'new',
      }),
    })

    if (!response.ok) {
      const data = await response.json()
      return {
        success: false,
        error: data.error || 'Failed to submit request',
      }
    }

    const data = await response.json()
    return {
      success: true,
      requestId: data.id,
    }
  } catch (error) {
    console.error('Request submission error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to submit request',
    }
  }
}

/**
 * Fetch requests from a specific module
 */
export async function fetchRequests(
  module: string,
  options?: {
    skip?: number
    take?: number
    status?: string
  }
) {
  try {
    const params = new URLSearchParams()
    if (options?.skip) params.append('skip', options.skip.toString())
    if (options?.take) params.append('take', options.take.toString())
    if (options?.status) params.append('status', options.status)

    const response = await fetch(
      `/api/requests/${module}?${params.toString()}`
    )

    if (!response.ok) {
      return {
        success: false,
        error: 'Failed to fetch requests',
      }
    }

    return await response.json()
  } catch (error) {
    console.error('Fetch requests error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch requests',
    }
  }
}

/**
 * Fetch user notifications
 */
export async function fetchNotifications(options?: {
  skip?: number
  take?: number
  unreadOnly?: boolean
}) {
  try {
    const params = new URLSearchParams()
    if (options?.skip) params.append('skip', options.skip.toString())
    if (options?.take) params.append('take', options.take.toString())
    if (options?.unreadOnly)
      params.append('unreadOnly', options.unreadOnly.toString())

    const response = await fetch(`/api/notifications?${params.toString()}`)

    if (!response.ok) {
      return {
        success: false,
        error: 'Failed to fetch notifications',
      }
    }

    return await response.json()
  } catch (error) {
    console.error('Fetch notifications error:', error)
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to fetch notifications',
    }
  }
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(
  notificationId: string
): Promise<SubmitRequestResult> {
  try {
    const response = await fetch(`/api/notifications/${notificationId}`, {
      method: 'PATCH',
    })

    if (!response.ok) {
      return {
        success: false,
        error: 'Failed to mark notification as read',
      }
    }

    return { success: true }
  } catch (error) {
    console.error('Mark notification error:', error)
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to mark notification as read',
    }
  }
}
