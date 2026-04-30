const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

export async function apiCall<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
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
  listByRequest: (module: string, requestId: string) =>
    apiCall(`/requests/${module}/${requestId}/comments`),

  create: (module: string, requestId: string, data: any) =>
    apiCall(`/requests/${module}/${requestId}/comments`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
}

export const historyAPI = {
  getByRequest: (module: string, requestId: string) =>
    apiCall(`/requests/${module}/${requestId}/history`),
}
