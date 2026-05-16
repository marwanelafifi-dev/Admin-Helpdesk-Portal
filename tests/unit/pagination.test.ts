import { describe, expect, it } from "vitest"
import { getPaginationParams } from "@/lib/pagination"

describe("getPaginationParams", () => {
  it("returns parsed page, limit, and offset from the query string", () => {
    const result = getPaginationParams("http://localhost:3003/api/users?page=3&limit=25")

    expect(result).toEqual({
      page: 3,
      limit: 25,
      offset: 50,
    })
  })

  it("falls back to defaults and caps the limit at 100", () => {
    const result = getPaginationParams(
      "http://localhost:3003/api/users?page=-1&limit=999",
      { page: 2, limit: 20 }
    )

    expect(result).toEqual({
      page: 2,
      limit: 100,
      offset: 100,
    })
  })
})
