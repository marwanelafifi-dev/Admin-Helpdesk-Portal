import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

if (!process.env.DATABASE_URL) {
  console.error("[seed] DATABASE_URL is not set — skipping admin seed")
  process.exit(0)
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

try {
  await prisma.user.upsert({
    where: { email: "helpdesk.bdt@si-ware.com" },
    update: { role: "super_admin" },
    create: {
      email: "helpdesk.bdt@si-ware.com",
      name: "Helpdesk BDT",
      role: "super_admin",
      emailVerified: new Date(),
      sessionVersion: 0,
    },
  })
  console.log("[seed] super_admin user ensured: helpdesk.bdt@si-ware.com")
} catch (err) {
  console.error("[seed] Failed to seed admin user:", err.message)
} finally {
  await prisma.$disconnect()
}
