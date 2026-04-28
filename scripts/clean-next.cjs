const fs = require("fs")
const path = require("path")

for (const dir of [".next", ".next-dev"]) {
  const nextDir = path.join(process.cwd(), dir)

  if (fs.existsSync(nextDir)) {
    fs.rmSync(nextDir, { recursive: true, force: true })
  }
}
