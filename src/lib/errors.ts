/**
 * Typed error hierarchy for the AI agent layer.
 * Catching these lets the API route return the correct HTTP status
 * without leaking internal details to the client.
 */

export class AgentError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode = 500,
  ) {
    super(message)
    this.name = "AgentError"
  }
}

export class ToolError extends AgentError {
  constructor(
    message: string,
    public readonly toolName: string,
  ) {
    super(message, "TOOL_EXECUTION_ERROR", 500)
    this.name = "ToolError"
  }
}

export class ValidationError extends AgentError {
  constructor(message: string) {
    super(message, "VALIDATION_ERROR", 400)
    this.name = "ValidationError"
  }
}

export class RateLimitError extends AgentError {
  constructor(message = "Too many messages. Please wait a moment before sending another.") {
    super(
      message,
      "RATE_LIMIT_EXCEEDED",
      429,
    )
    this.name = "RateLimitError"
  }
}

export class PermissionError extends AgentError {
  constructor(action: string) {
    super(
      `You don't have permission to ${action}.`,
      "PERMISSION_DENIED",
      403,
    )
    this.name = "PermissionError"
  }
}

export class GroqApiError extends AgentError {
  constructor(message: string) {
    super(message, "GROQ_API_ERROR", 502)
    this.name = "GroqApiError"
  }
}
