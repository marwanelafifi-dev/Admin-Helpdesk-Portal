import { describe, expect, it, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

// Reset module between tests to clear in-memory store
beforeEach(async () => {
  vi.resetModules()
})

function makeRequest(ip: string) {
  return new NextRequest("http://localhost:3003/api/test", {
    headers: { "x-forwarded-for": ip },
  })
}

describe("rateLimit()", () => {
  it("allows requests within limit", async () => {
    const { rateLimit } = await import("@/lib/rate-limit")
    const req = makeRequest("1.2.3.4")
    const result = rateLimit(req)
    expect(result).toBeNull()
  })

  it("returns 429 after exceeding 100 requests", async () => {
    const { rateLimit } = await import("@/lib/rate-limit")
    const req = makeRequest("5.6.7.8")

    // Exhaust the limit
    for (let i = 0; i < 100; i++) {
      rateLimit(req)
    }

    const result = rateLimit(req)
    expect(result).not.toBeNull()
    expect(result!.status).toBe(429)
  })

  it("includes Retry-After header on 429", async () => {
    const { rateLimit } = await import("@/lib/rate-limit")
    const req = makeRequest("9.10.11.12")

    for (let i = 0; i < 101; i++) {
      rateLimit(req)
    }

    const result = rateLimit(req)
    expect(result?.headers.get("Retry-After")).toBeTruthy()
    expect(result?.headers.get("X-RateLimit-Remaining")).toBe("0")
  })

  it("tracks different IPs independently", async () => {
    const { rateLimit } = await import("@/lib/rate-limit")
    const req1 = makeRequest("10.0.0.1")
    const req2 = makeRequest("10.0.0.2")

    // Exhaust IP 1
    for (let i = 0; i < 101; i++) {
      rateLimit(req1)
    }

    // IP 2 should still be fine
    expect(rateLimit(req2)).toBeNull()
    expect(rateLimit(req1)!.status).toBe(429)
  })
})
