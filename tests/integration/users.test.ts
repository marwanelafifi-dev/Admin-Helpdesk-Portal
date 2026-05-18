import { beforeEach, describe, expect, it, vi } from "vitest"

const getServerSessionMock = vi.fn()
const updateUserRoleMock = vi.fn()
const prismaMock = {
  user: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    count: vi.fn(),
    delete: vi.fn(),
  },
}

vi.mock("next-auth", () => ({ getServerSession: getServerSessionMock }))
vi.mock("@/lib/auth", () => ({ authOptions: {} }))
vi.mock("@/server/db", () => ({ prisma: prismaMock }))
vi.mock("@/lib/user-admin", async () => {
  const actual = await vi.importActual<typeof import("@/lib/user-admin")>("@/lib/user-admin")
  return { ...actual, updateUserRole: updateUserRoleMock }
})

const superAdminSession = { user: { id: "sa-1", role: "super_admin" } }
const adminSession = { user: { id: "admin-1", role: "admin" } }
const employeeSession = { user: { id: "emp-1", role: "employee" } }

describe("GET /api/users — super_admin only", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns 401 when not authenticated", async () => {
    getServerSessionMock.mockResolvedValue(null)
    const { GET } = await import("@/app/api/users/route")
    const res = await GET(new Request("http://localhost:3003/api/users") as never)
    expect(res.status).toBe(401)
  })

  it("returns 403 for admin role", async () => {
    getServerSessionMock.mockResolvedValue(adminSession)
    const { GET } = await import("@/app/api/users/route")
    const res = await GET(new Request("http://localhost:3003/api/users") as never)
    expect(res.status).toBe(403)
  })

  it("returns 403 for employee role", async () => {
    getServerSessionMock.mockResolvedValue(employeeSession)
    const { GET } = await import("@/app/api/users/route")
    const res = await GET(new Request("http://localhost:3003/api/users") as never)
    expect(res.status).toBe(403)
  })

  it("allows super_admin to list users", async () => {
    getServerSessionMock.mockResolvedValue(superAdminSession)
    prismaMock.user.findMany.mockResolvedValue([])
    prismaMock.user.count.mockResolvedValue(0)

    const { GET } = await import("@/app/api/users/route")
    const res = await GET(new Request("http://localhost:3003/api/users") as never)
    expect(res.status).toBe(200)
  })
})

describe("DELETE /api/users/[id] — self-deletion guard", () => {
  beforeEach(() => vi.clearAllMocks())

  it("prevents super_admin from deleting own account", async () => {
    getServerSessionMock.mockResolvedValue(superAdminSession)

    const { DELETE } = await import("@/app/api/users/[id]/route")
    const res = await DELETE(
      new Request("http://localhost:3003/api/users/sa-1") as never,
      { params: Promise.resolve({ id: "sa-1" }) }
    )
    expect(res.status).toBe(400)
    expect(prismaMock.user.delete).not.toHaveBeenCalled()
  })

  it("allows super_admin to delete another user", async () => {
    getServerSessionMock.mockResolvedValue(superAdminSession)
    prismaMock.user.delete.mockResolvedValue({ id: "other-1" })

    const { DELETE } = await import("@/app/api/users/[id]/route")
    const res = await DELETE(
      new Request("http://localhost:3003/api/users/other-1") as never,
      { params: Promise.resolve({ id: "other-1" }) }
    )
    expect(res.status).toBe(200)
  })
})

describe("PATCH /api/users/[id] — role update", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns 403 for non super_admin", async () => {
    getServerSessionMock.mockResolvedValue(adminSession)
    const { PATCH } = await import("@/app/api/users/[id]/route")
    const res = await PATCH(
      new Request("http://localhost:3003/api/users/emp-1", {
        method: "PATCH",
        body: JSON.stringify({ role: "admin" }),
      }) as never,
      { params: Promise.resolve({ id: "emp-1" }) }
    )
    expect(res.status).toBe(403)
    expect(updateUserRoleMock).not.toHaveBeenCalled()
  })

  it("rejects invalid role", async () => {
    getServerSessionMock.mockResolvedValue(superAdminSession)
    const { PATCH } = await import("@/app/api/users/[id]/route")
    const res = await PATCH(
      new Request("http://localhost:3003/api/users/emp-1", {
        method: "PATCH",
        body: JSON.stringify({ role: "hacker" }),
      }) as never,
      { params: Promise.resolve({ id: "emp-1" }) }
    )
    expect(res.status).toBe(400)
    expect(updateUserRoleMock).not.toHaveBeenCalled()
  })
})
