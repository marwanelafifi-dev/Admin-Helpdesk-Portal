import { NextResponse } from "next/server"

export const DEFAULT_MAX_JSON_BODY_BYTES = 1024 * 1024

export function enforceJsonBodyLimit(
  request: Request,
  maxBytes = DEFAULT_MAX_JSON_BODY_BYTES
) {
  const contentLength = request.headers.get("content-length")
  if (!contentLength) return null

  const size = Number.parseInt(contentLength, 10)
  if (!Number.isFinite(size)) return null

  if (size > maxBytes) {
    return NextResponse.json(
      {
        error: `Payload too large. Maximum allowed size is ${maxBytes} bytes.`,
      },
      { status: 413 }
    )
  }

  return null
}
