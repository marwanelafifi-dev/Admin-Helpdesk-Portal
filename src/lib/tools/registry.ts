/**
 * Tool Registry
 *
 * Single source of truth for every tool the agent can call.
 *
 * To add a new tool:
 *   1. Create src/lib/tools/my-tool.tool.ts exporting an `AgentTool` object.
 *   2. Import it here and add it to `ALL_TOOLS`.
 *   Done — the orchestrator and Groq definition array pick it up automatically.
 */

import type { AgentTool, GroqToolDefinition, ToolContext, ToolResult } from "@/lib/agent/types"
import { PermissionError } from "@/lib/errors"

import { submitRequestTool }    from "./submit-request.tool"
import { getMyRequestsTool,
         getRequestDetailsTool,
         searchRequestsTool }   from "./query-requests.tool"
import { getPlatformStatsTool } from "./platform-stats.tool"

// ─── Registry map ─────────────────────────────────────────────────────────────

const ALL_TOOLS: Record<string, AgentTool> = {
  submit_request:      submitRequestTool,
  get_my_requests:     getMyRequestsTool,
  get_request_details: getRequestDetailsTool,
  search_requests:     searchRequestsTool,
  get_platform_stats:  getPlatformStatsTool,
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns the array of tool definitions to pass directly to the Groq API.
 * Filters to only the tools the current user's role is allowed to see.
 */
export function getToolDefinitions(userRole: string): GroqToolDefinition[] {
  return Object.values(ALL_TOOLS)
    .filter((tool) => {
      if (!tool.allowedRoles) return true               // public tool
      return tool.allowedRoles.includes(userRole)       // role-restricted
    })
    .map((tool) => tool.definition)
}

/**
 * Execute a named tool.
 * Throws `PermissionError` if the user's role isn't allowed.
 * Throws `ToolError` / `ValidationError` from within the tool itself.
 */
export async function executeTool(
  name: string,
  args: unknown,
  ctx: ToolContext,
): Promise<ToolResult> {
  const tool = ALL_TOOLS[name]

  if (!tool) {
    return {
      success: false,
      error: `Unknown tool: "${name}". This is an internal error — do not retry.`,
    }
  }

  // Role gate before executing
  if (tool.allowedRoles && !tool.allowedRoles.includes(ctx.userRole)) {
    throw new PermissionError(`use the ${name} tool`)
  }

  return tool.execute(args, ctx)
}
