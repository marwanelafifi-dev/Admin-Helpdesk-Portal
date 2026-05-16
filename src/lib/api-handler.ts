import { NextRequest, NextResponse } from "next/server"
import { logger } from "@/lib/logger"

type Handler<TContext = unknown> = (
  request: Request,
  context: TContext
) => Promise<NextResponse> | NextResponse

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  return "Internal server error"
}

export function withApiHandler<TContext = unknown>(handler: Handler<TContext>) {
  return async (request: NextRequest, context: TContext) => {
    const startedAt = Date.now()

    try {
      const response = await handler(request, context)

      logger.info({
        msg: "request completed",
        method: request.method,
        url: request.url,
        statusCode: response.status,
        durationMs: Date.now() - startedAt,
      })

      return response
    } catch (error) {
      logger.error({
        msg: "request failed",
        method: request.method,
        url: request.url,
        statusCode: 500,
        durationMs: Date.now() - startedAt,
        err: error,
      })

      return NextResponse.json(
        { error: getErrorMessage(error) },
        { status: 500 }
      )
    }
  }
}
