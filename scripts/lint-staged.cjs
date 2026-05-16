const { spawnSync } = require("node:child_process")

const files = process.argv.slice(2).filter(Boolean)

if (files.length === 0) {
  process.exit(0)
}

const args = ["run", "lint", "--"]
for (const file of files) {
  args.push("--file", file)
}

const result = spawnSync("npm", args, {
  stdio: "inherit",
  shell: false,
})

process.exit(result.status ?? 1)
