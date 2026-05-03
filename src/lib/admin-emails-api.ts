export interface AdminUser {
  id: string
  name: string | null
  email: string | null
  role: string
}

export interface AdminEmailsResponse {
  emails: string[]
  count: number
  users: AdminUser[]
}

export async function getAdminEmails(): Promise<AdminEmailsResponse> {
  const response = await fetch('/api/admin-emails')
  if (!response.ok) {
    throw new Error('Failed to fetch admin emails')
  }
  return response.json()
}
