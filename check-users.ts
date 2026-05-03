import "dotenv/config";
import { getPrisma } from "./src/server/engine/prisma";

async function main() {
  try {
    const prisma = getPrisma();
    const count = await prisma.user.count();
    console.log(`Total users: ${count}`);

    const users = await prisma.user.findMany({
      select: { email: true, role: true },
    });
    console.log("Users:", users);
  } catch (error) {
    console.error("Failed to load users:", error);
    process.exit(1);
  }
}

main();
