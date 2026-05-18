import { describe, expect, it } from "vitest"
import { can, isRestricted, PERMISSIONS } from "@/lib/permissions/client"

describe("can()", () => {
  it("returns false for undefined role", () => {
    expect(can(undefined, "dashboard")).toBe(false)
  })

  it("returns false for unknown role", () => {
    expect(can("hacker", "dashboard")).toBe(false)
  })

  it("super_admin can access all permissions", () => {
    const perms = Object.keys(PERMISSIONS) as (keyof typeof PERMISSIONS)[]
    perms.forEach((perm) => {
      expect(can("super_admin", perm)).toBe(true)
    })
  })

  it("employee cannot access admin-only permissions", () => {
    expect(can("employee", "adminPanel")).toBe(false)
    expect(can("employee", "deleteRequests")).toBe(false)
    expect(can("employee", "analytics")).toBe(false)
    expect(can("employee", "allRequests")).toBe(false)
  })

  it("external cannot access admin-only permissions", () => {
    expect(can("external", "adminPanel")).toBe(false)
    expect(can("external", "deleteRequests")).toBe(false)
    expect(can("external", "analytics")).toBe(false)
  })

  it("manager can update requests but not delete them", () => {
    expect(can("manager", "updateRequests")).toBe(true)
    expect(can("manager", "deleteRequests")).toBe(false)
  })

  it("admin can delete requests", () => {
    expect(can("admin", "deleteRequests")).toBe(true)
  })

  it("manager has access to adminPanel", () => {
    expect(can("manager", "adminPanel")).toBe(true)
  })
})

describe("isRestricted()", () => {
  it("employee is restricted", () => {
    expect(isRestricted("employee")).toBe(true)
  })

  it("external is restricted", () => {
    expect(isRestricted("external")).toBe(true)
  })

  it("admin is not restricted", () => {
    expect(isRestricted("admin")).toBe(false)
  })

  it("manager is not restricted", () => {
    expect(isRestricted("manager")).toBe(false)
  })

  it("super_admin is not restricted", () => {
    expect(isRestricted("super_admin")).toBe(false)
  })

  it("undefined is not treated as restricted (no role = no access via can())", () => {
    expect(isRestricted(undefined)).toBe(false)
  })
})
