import { beforeEach, describe, expect, it, vi } from "vitest"

const getServerSessionMock = vi.fn()
const prismaMock = {
  notification: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
}

vi.mock("next-auth", () => ({ getServerSession: getServerSessionMock }))
vi.mock("@/lib/auth", () => ({ authOptions: {} }))
vi.mock("@/server/db", () => ({ prisma: prismaMock }))

const adminSession = { user: { id: "admin-1", role: "admin" } }
const employeeSession = { user: { id: "emp-1", role: "employee" } }

describe("GET /api/notifications", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns 401 when not authenticated", async () => {
    getServerSessionMock.mockResolvedValue(null)
    const { GET } = await import("@/app/api/notifications/route")
    const res = await GET(new Request("http://localhost:3003/api/notifications") as never)
    expect(res.status).toBe(401)
  })

  it("returns only the current user's notifications", async () => {
    getServerSessionMock.mockResolvedValue(employeeSession)
    prismaMock.notification.findMany.mockResolvedValue([])
    prismaMock.notification.count.mockResolvedValue(0)

    const { GET } = await import("@/app/api/notifications/route")
    await GET(new Request("http://localhost:3003/api/notifications") as never)

    expect(prismaMock.notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "emp-1" } })
    )
  })

  it("limits take to max 100", async () => {
    getServerSessionMock.mockResolvedValue(employeeSession)
    prismaMock.notification.findMany.mockResolvedValue([])
    prismaMock.notification.count.mockResolvedValue(0)

    const { GET } = await import("@/app/api/notifications/route")
    await GET(new Request("http://localhost:3003/api/notifications?take=9999") as never)

    const call = prismaMock.notification.findMany.mock.calls[0][0]
    expect(call.take).toBeLessThanOrEqual(100)
  })
})

describe("POST /api/notifications", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns 401 when not authenticated", async () => {
    getServerSessionMock.mockResolvedValue(null)
    const { POST } = await import("@/app/api/notifications/route")
    const res = await POST(
      new Request("http://localhost:3003/api/notifications", {
        method: "POST",
        body: JSON.stringify({ type: "admin_alert", title: "Test", message: "Test" }),
      }) as never
    )
    expect(res.status).toBe(401)
  })

  it("returns 400 for invalid notification type", async () => {
    getServerSessionMock.mockResolvedValue(adminSession)
    const { POST } = await import("@/app/api/notifications/route")
    const res = await POST(
      new Request("http://localhost:3003/api/notifications", {
        method: "POST",
        body: JSON.stringify({ type: "INVALID_TYPE", title: "Test", message: "Test" }),
      }) as never
    )
    expect(res.status).toBe(400)
  })

  it("creates notification with valid payload", async () => {
    getServerSessionMock.mockResolvedValue(adminSession)
    prismaMock.notification.create.mockResolvedValue({ id: "n-1", type: "admin_alert" })

    const { POST } = await import("@/app/api/notifications/route")
    const res = await POST(
      new Request("http://localhost:3003/api/notifications", {
        method: "POST",
        body: JSON.stringify({ type: "admin_alert", title: "Alert", message: "System alert" }),
      }) as never
    )
    expect(res.status).toBe(201)
    expect(prismaMock.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ userId: "admin-1" }) })
    )
  })
})

describe("PATCH /api/notifications/read-all", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns 401 when not authenticated", async () => {
    getServerSessionMock.mockResolvedValue(null)
    const { PATCH } = await import("@/app/api/notifications/read-all/route")
    const res = await PATCH(new Request("http://localhost:3003/api/notifications/read-all") as never)
    expect(res.status).toBe(401)
  })

  it("marks all user notifications as read", async () => {
    getServerSessionMock.mockResolvedValue(employeeSession)
    prismaMock.notification.updateMany.mockResolvedValue({ count: 5 })

    const { PATCH } = await import("@/app/api/notifications/read-all/route")
    const res = await PATCH(new Request("http://localhost:3003/api/notifications/read-all") as never)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.updated).toBe(5)
    expect(prismaMock.notification.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "emp-1", read: false } })
    )
  })
})
