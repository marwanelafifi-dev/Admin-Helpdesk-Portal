/**
 * URL segments under /:module/:id that are static app routes, not request IDs.
 * Prevents /api/requests/:module/new (etc.) from being treated as a record lookup.
 */
export const RESERVED_REQUEST_PATH_IDS = new Set([
  "new",
  "receiving",
  "sending",
  "edit",
])

export function isReservedRequestPathId(segment: string): boolean {
  return RESERVED_REQUEST_PATH_IDS.has(segment.toLowerCase())
}
