import { describe, expect, it } from "vitest"
import { getPaginationParams } from "@/lib/pagination"

describe("getPaginationParams", () => {
  it("returns parsed page, limit, and offset from the query string", () => {
    const result = getPaginationParams("http://localhost:3003/api/users?page=3&limit=25")
    expect(result).toEqual({ page: 3, limit: 25, offset: 50 })
  })

  it("falls back to defaults and caps the limit at 100", () => {
    const result = getPaginationParams(
      "http://localhost:3003/api/users?page=-1&limit=999",
      { page: 2, limit: 20 }
    )
    expect(result).toEqual({ page: 2, limit: 100, offset: 100 })
  })

  it("uses defaults when no params supplied", () => {
    const result = getPaginationParams("http://localhost:3003/api/test", { page: 1, limit: 20 })
    expect(result).toEqual({ page: 1, limit: 20, offset: 0 })
  })

  it("falls back to default page when page is 0", () => {
    const result = getPaginationParams("http://localhost:3003/api/test?page=0&limit=10", { page: 1 })
    expect(result.page).toBe(1)
  })

  it("calculates correct offset for page 5", () => {
    const result = getPaginationParams("http://localhost:3003/api/test?page=5&limit=20")
    expect(result.offset).toBe(80)
  })

  it("falls back to page default when page is non-numeric", () => {
    const result = getPaginationParams("http://localhost:3003/api/test?page=abc", { page: 1 })
    expect(result.page).toBe(1)
  })
})
