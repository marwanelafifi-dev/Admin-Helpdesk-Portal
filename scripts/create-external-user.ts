/**
 * Usage: npx tsx scripts/create-external-user.ts <email> <password> <name> [role]
 * Role options: external (default), admin, manager
 * Example: npx tsx scripts/create-external-user.ts vendor@acme.com "P@ssw0rd" "John Doe" external
 */
import "dotenv/config"
import bcrypt from "bcryptjs"
import { getPrisma } from "../src/server/engine/prisma"

async function main() {
  const [, , email, password, name, role = "external"] = process.argv

  if (!email || !password || !name) {
    console.error("Usage: npx tsx scripts/create-external-user.ts <email> <password> <name> [role]")
    process.exit(1)
  }

  const hash = await bcrypt.hash(password, 12)
  const prisma = getPrisma()

  const user = await prisma.user.upsert({
    where: { email },
    update: { password: hash, name, role: role as never },
    create: { email, password: hash, name, role: role as never },
  })

  console.log(`✓ User created/updated: ${user.email} (role: ${user.role})`)
  process.exit(0)
}

main().catch((e) => { console.error(e); process.exit(1) })
