export interface Approver {
  id: string
  name: string | null
  email: string | null
  role: string
}

export interface ApproversResponse {
  users: Approver[]
}

export async function getApprovers(): Promise<ApproversResponse> {
  const response = await fetch('/api/approvers')
  if (!response.ok) {
    throw new Error('Failed to fetch approvers')
  }
  return response.json()
}
