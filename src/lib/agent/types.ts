// ─── Groq / OpenAI-compatible chat message types ─────────────────────────────

export interface SystemMessage {
  role: "system"
  content: string
}

export interface UserMessage {
  role: "user"
  content: string
}

export interface AssistantMessage {
  role: "assistant"
  content: string | null
  tool_calls?: ToolCall[]
}

export interface ToolResultMessage {
  role: "tool"
  content: string       // JSON-stringified ToolResult
  tool_call_id: string
}

/** Everything the Groq API can receive in the messages array. */
export type ChatMessage =
  | SystemMessage
  | UserMessage
  | AssistantMessage
  | ToolResultMessage

export interface ToolCall {
  id: string
  type: "function"
  function: {
    name: string
    arguments: string   // JSON string
  }
}

/** JSON-schema shape that Groq accepts in the `tools` array. */
export interface GroqToolDefinition {
  type: "function"
  function: {
    name: string
    description: string
    parameters: {
      type: "object"
      properties: Record<string, unknown>
      required?: string[]
    }
  }
}

export interface GroqApiResponse {
  choices: Array<{
    message: AssistantMessage
    finish_reason: "stop" | "tool_calls" | "length" | "content_filter"
  }>
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

// ─── Agent internals ──────────────────────────────────────────────────────────

/**
 * Auth context injected into every tool call.
 * Tools use this for permission checks and to stamp records (e.g. requesterId).
 */
export interface ToolContext {
  userId: string
  userName: string
  userEmail: string
  userRole: string
}

/** Uniform return shape from every tool. */
export interface ToolResult<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

/**
 * A registered tool.
 * `allowedRoles` — if set, the orchestrator rejects the call for other roles
 * before even invoking `execute`.
 */
export interface AgentTool {
  definition: GroqToolDefinition
  allowedRoles?: string[]
  execute(args: unknown, ctx: ToolContext): Promise<ToolResult>
}

// ─── API contract (client ↔ route) ───────────────────────────────────────────

/** Body sent by React / React Native client → POST /api/ai-assistant */
export interface AgentRequestBody {
  message: string
  conversationId?: string | null
  /** Lightweight history the client already has (user + assistant text only). */
  history: Array<{ role: "user" | "assistant"; content: string }>
}

/** Body returned to the client. */
export interface AgentResponseBody {
  content: string
  conversationId: string
  /** Populated only when a request was submitted during this turn. */
  requestId?: string
  requestModule?: string
}
