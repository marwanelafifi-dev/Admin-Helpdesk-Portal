import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  transpilePackages: ["react-markdown", "remark-parse", "remark-rehype", "unified", "bail", "is-plain-obj", "trough", "vfile", "vfile-message", "unist-util-stringify-position", "mdast-util-from-markdown", "mdast-util-to-hast", "micromark", "decode-named-character-reference", "character-entities", "property-information", "hast-util-whitespace", "space-separated-tokens", "comma-separated-tokens", "hast-util-to-jsx-runtime", "devlop"],
  env: {
    NEXT_PUBLIC_ENABLE_GOOGLE_AUTH: process.env.ENABLE_GOOGLE_AUTH ?? "true",
  },
  distDir: ".next-dev",
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  serverExternalPackages: ["imapflow", "mailparser"],
  skipTrailingSlashRedirect: true,
}

export default nextConfig
