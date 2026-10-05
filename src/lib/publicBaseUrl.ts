/**
 * Return the browser-facing application origin for server redirects.
 *
 * Reverse proxies and Cloudflare Tunnel forward requests to the local
 * application port, so request.url may point at localhost rather than the
 * address a user can reach.
 */
export function configuredPublicBaseUrl(fallback: string | URL): URL {
  const configured = process.env.NEXTAUTH_URL ?? process.env.AUTH_URL
  if (configured) {
    try {
      return new URL(configured)
    } catch {
      // Fall through to the request origin if the deployment setting is bad.
    }
  }
  return new URL(fallback)
}

export function publicBaseUrl(request: Request): URL {
  return configuredPublicBaseUrl(request.url)
}
