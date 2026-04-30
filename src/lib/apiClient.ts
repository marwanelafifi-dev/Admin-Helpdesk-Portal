const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api'

export async function apiCall<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  })

  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`)
  }

  return response.json()
}

export const requestsAPI = {
  listByModule: (module: string, status?: string) =>
    apiCall(`/requests/${module}?${status ? `status=${status}` : ''}`),

  getOne: (module: string, id: string) =>
    apiCall(`/requests/${module}/${id}`),

  create: (module: string, data: any) =>
    apiCall(`/requests/${module}`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateStatus: (module: string, id: string, status: string) =>
    apiCall(`/requests/${module}/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
}

export const commentsAPI = {
  list: async (requestId: string, limit?: number, offset?: number) => {
    const params = new URLSearchParams()
    params.append('requestId', requestId)
    if (limit) params.append('limit', limit.toString())
    if (offset) params.append('offset', offset.toString())
    try {
      // Use relative path for Next.js API routes
      const url = `/api/requests/comments?${params.toString()}`
      const response = await fetch(url)
      if (!response.ok) {
        console.error(`API Error fetching comments for ${requestId}: ${response.status}`, response.statusText)
        throw new Error(`API Error: ${response.status} ${response.statusText}`)
      }
      return await response.json()
    } catch (error) {
      console.error(`Failed to fetch comments for ${requestId}:`, error)
      throw error
    }
  },

  create: async (requestId: string, content: string, authorId: string, authorName: string, authorEmail: string, files?: File[]) => {
    const formData = new FormData()
    formData.append('requestId', requestId)
    formData.append('content', content)
    formData.append('authorId', authorId)
    formData.append('authorName', authorName)
    formData.append('authorEmail', authorEmail)

    if (files) {
      files.forEach((file) => formData.append('files', file))
    }

    const response = await fetch('/api/requests/comments', {
      method: 'POST',
      body: formData,
      // DO NOT set Content-Type header - browser will set it with boundary
    })

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`)
    }

    return response.json()
  },

  delete: (commentId: string) =>
    fetch(`/api/requests/comments/${commentId}`, {
      method: 'DELETE',
    }).then(r => {
      if (!r.ok) throw new Error(`API Error: ${r.status}`)
      return r.json()
    }),

  update: (commentId: string, content: string) =>
    fetch(`/api/requests/comments/${commentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    }).then(r => {
      if (!r.ok) throw new Error(`API Error: ${r.status}`)
      return r.json()
    }),
}

export const historyAPI = {
  getByRequest: (module: string, requestId: string) =>
    apiCall(`/requests/${module}/${requestId}/history`),
}
