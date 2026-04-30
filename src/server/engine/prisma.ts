import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

declare global {
  // eslint-disable-next-line no-var
  var __arpPrisma: PrismaClient | undefined
}

export function getPrisma(): PrismaClient {
  if (!globalThis.__arpPrisma) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is not set")
    }

    const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
    globalThis.__arpPrisma = new PrismaClient({
      adapter,
    })
  }
  return globalThis.__arpPrisma
}
