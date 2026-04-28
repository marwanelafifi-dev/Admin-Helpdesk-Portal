const { startServer } = require("next/dist/server/lib/start-server")

const port = Number(process.env.PORT || 3003)

async function main() {
  await startServer({
    dir: process.cwd(),
    isDev: true,
    hostname: "0.0.0.0",
    port,
    minimalMode: false,
    allowRetry: false,
    keepAliveTimeout: 5000,
  })
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
