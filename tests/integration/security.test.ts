import { beforeEach, describe, expect, it, vi } from "vitest"

const getServerSessionMock = vi.fn()
const updateUserRoleMock = vi.fn()

vi.mock("next-auth", () => ({
  getServerSession: getServerSessionMock,
}))

vi.mock("@/lib/user-admin", async () => {
  const actual = await vi.importActual<typeof import("@/lib/user-admin")>("@/lib/user-admin")
  return {
    ...actual,
    updateUserRole: updateUserRoleMock,
  }
})

describe("security integration", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns 403 when a viewer tries to access the role update endpoint", async () => {
    getServerSessionMock.mockResolvedValue({
      user: {
        id: "viewer-1",
        role: "viewer",
      },
    })

    const { PATCH } = await import("@/app/api/users/role/route")
    const response = await PATCH(
      new Request("http://localhost:3003/api/users/role", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          userId: "user-1",
          newRoleId: "admin",
        }),
      }),
      undefined as never
    )

    expect(response.status).toBe(403)
    expect(updateUserRoleMock).not.toHaveBeenCalled()
  })

  it("rejects excessively large payloads with 413", async () => {
    const hugePayload = JSON.stringify({
      userId: "user-1",
      newRoleId: "admin",
      padding: "x".repeat(17 * 1024),
    })

    const { PATCH } = await import("@/app/api/users/role/route")
    const response = await PATCH(
      new Request("http://localhost:3003/api/users/role", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          "content-length": String(Buffer.byteLength(hugePayload)),
        },
        body: hugePayload,
      }),
      undefined as never
    )

    expect(response.status).toBe(413)
    expect(getServerSessionMock).not.toHaveBeenCalled()
  })

  it("disables the X-Powered-By header in Next.js config", async () => {
    const nextConfigModule = await import("../../next.config")
    const nextConfig = nextConfigModule.default

    expect(nextConfig.poweredByHeader).toBe(false)
  })
})
