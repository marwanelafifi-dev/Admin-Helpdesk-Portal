import { vi } from "vitest"

export type MockSession = {
  user: {
    id: string
    email?: string
    name?: string
    role: string
    image?: string
  }
}

export const mockSession = (session: MockSession | null) => {
  vi.mock("next-auth", () => ({
    getServerSession: vi.fn().mockResolvedValue(session),
  }))
}

export const sessions = {
  superAdmin: {
    user: { id: "sa-1", email: "superadmin@test.com", name: "Super Admin", role: "super_admin" },
  },
  admin: {
    user: { id: "admin-1", email: "admin@test.com", name: "Admin", role: "admin" },
  },
  manager: {
    user: { id: "manager-1", email: "manager@test.com", name: "Manager", role: "manager" },
  },
  employee: {
    user: { id: "emp-1", email: "employee@test.com", name: "Employee", role: "employee" },
  },
  external: {
    user: { id: "ext-1", email: "external@test.com", name: "External", role: "external" },
  },
} as const
