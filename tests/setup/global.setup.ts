import { vi } from "vitest"

// Silence console.error in tests unless explicitly needed
vi.spyOn(console, "error").mockImplementation(() => {})

// Global env defaults for tests
process.env.NEXTAUTH_SECRET = "test-secret-at-least-32-chars-long!!"
process.env.NEXTAUTH_URL = "http://localhost:3003"
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test"
vi.stubEnv("NODE_ENV", "test")
