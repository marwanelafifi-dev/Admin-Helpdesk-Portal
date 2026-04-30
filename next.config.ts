import type { NextConfig } from "next"

// Allow Node.js to connect through the corporate proxy's self-signed certificate
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"

const nextConfig: NextConfig = {
  distDir: ".next-dev",
}

export default nextConfig
