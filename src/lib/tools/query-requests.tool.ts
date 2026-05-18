import { getPrisma } from "@/server/engine/prisma"
import type { AgentTool, ToolContext, ToolResult } from "@/lib/agent/types"
import { ToolError, PermissionError } from "@/lib/errors"
import {
  getMyRequestsSchema,
  getRequestDetailsSchema,
  searchRequestsSchema,
} from "./validation"

// ─── Shared helper ─────────────────────────────────────────────────────────────

function formatRequest(r: {
  id: string
  module: string
  title: string
  status: string
  createdAt: Date
  updatedAt: Date
  payload?: unknown
  statusHistory?: unknown
}) {
  return {
    id: r.id,
    module: r.module,
    title: r.title,
    status: r.status,
    submittedAt: r.createdAt.toISOString().split("T")[0],
    lastUpdated: r.updatedAt.toISOString().split("T")[0],
  }
}

// ─── Tool 1: get_my_requests ──────────────────────────────────────────────────

export const getMyRequestsTool: AgentTool = {
  definition: {
    type: "function",
    function: {
      name: "get_my_requests",
      description:
        "Retrieve a paginated list of the current user's requests. " +
        "Use this when the user asks 'what are my requests', 'show my requests', " +
        "'do I have any pending requests', etc.",
      parameters: {
        type: "object",
        properties: {
          module: {
            type: "string",
            enum: ["shipping", "maintenance", "purchase", "event", "travel", "hr"],
            description: "Filter by module. Omit to show all modules.",
          },
          status: {
            type: "string",
            description:
              "Filter by status slug (new, on_hold, in_transit, completed, cancelled, …). " +
              "Omit to show all statuses.",
          },
          limit: {
            type: "number",
            description: "Max results to return (1–20). Default 10.",
          },
          offset: {
            type: "number",
            description: "Number of results to skip for pagination. Default 0.",
          },
        },
        required: [],
      },
    },
  },

  async execute(args: unknown, ctx: ToolContext): Promise<ToolResult> {
    const parsed = getMyRequestsSchema.safeParse(args)
    if (!parsed.success) {
      throw new ToolError(
        `Invalid arguments: ${parsed.error.issues.map((i) => i.message).join("; ")}`,
        "get_my_requests",
      )
    }

    const { module, status, limit, offset } = parsed.data
    const prisma = getPrisma()

    const [requests, total] = await Promise.all([
      prisma.request.findMany({
        where: {
          requesterId: ctx.userId,
          ...(module ? { module } : {}),
          ...(status ? { status } : {}),
        },
        orderBy: { updatedAt: "desc" },
        take: limit,
        skip: offset,
        select: {
          id: true,
          module: true,
          title: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.request.count({
        where: {
          requesterId: ctx.userId,
          ...(module ? { module } : {}),
          ...(status ? { status } : {}),
        },
      }),
    ])

    return {
      success: true,
      data: {
        requests: requests.map(formatRequest),
        total,
        returned: requests.length,
        offset,
      },
    }
  },
}

// ─── Tool 2: get_request_details ─────────────────────────────────────────────

export const getRequestDetailsTool: AgentTool = {
  definition: {
    type: "function",
    function: {
      name: "get_request_details",
      description:
        "Fetch the full details and status history of a specific request by ID. " +
        "Use this when the user asks about the status or details of a particular request.",
      parameters: {
        type: "object",
        properties: {
          requestId: {
            type: "string",
            description: "The unique ID of the request (e.g. clxyz123…).",
          },
        },
        required: ["requestId"],
      },
    },
  },

  async execute(args: unknown, ctx: ToolContext): Promise<ToolResult> {
    const parsed = getRequestDetailsSchema.safeParse(args)
    if (!parsed.success) {
      throw new ToolError(
        `Invalid arguments: ${parsed.error.issues.map((i) => i.message).join("; ")}`,
        "get_request_details",
      )
    }

    const prisma = getPrisma()
    const request = await prisma.request.findUnique({
      where: { id: parsed.data.requestId },
      select: {
        id: true,
        module: true,
        title: true,
        status: true,
        payload: true,
        statusHistory: true,
        createdAt: true,
        updatedAt: true,
        requesterId: true,
        requester: { select: { name: true, email: true } },
      },
    })

    if (!request) {
      return { success: false, error: "Request not found." }
    }

    // Users may only see their own requests unless they are admin/manager
    const isPrivileged = ["admin", "super_admin", "manager"].includes(ctx.userRole)
    if (!isPrivileged && request.requesterId !== ctx.userId) {
      return { success: false, error: "You can only view your own requests." }
    }

    return {
      success: true,
      data: {
        id: request.id,
        module: request.module,
        title: request.title,
        status: request.status,
        payload: request.payload,
        statusHistory: request.statusHistory,
        submittedAt: request.createdAt.toISOString().split("T")[0],
        lastUpdated: request.updatedAt.toISOString().split("T")[0],
        requester: request.requester,
      },
    }
  },
}

// ─── Tool 3: search_requests (admin / manager only) ───────────────────────────

export const searchRequestsTool: AgentTool = {
  allowedRoles: ["admin", "super_admin", "manager"],

  definition: {
    type: "function",
    function: {
      name: "search_requests",
      description:
        "Search across ALL requests by title keyword. " +
        "Available to managers and admins only. " +
        "Use this when a manager asks about a specific employee's request or a keyword search.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Keyword to search in request titles.",
          },
          module: {
            type: "string",
            enum: ["shipping", "maintenance", "purchase", "event", "travel", "hr"],
            description: "Optionally restrict to one module.",
          },
          status: {
            type: "string",
            description: "Optionally restrict to one status slug.",
          },
          limit: {
            type: "number",
            description: "Max results (1–20). Default 10.",
          },
        },
        required: ["query"],
      },
    },
  },

  async execute(args: unknown, ctx: ToolContext): Promise<ToolResult> {
    const isPrivileged = ["admin", "super_admin", "manager"].includes(ctx.userRole)
    if (!isPrivileged) {
      throw new PermissionError("search across all requests")
    }

    const parsed = searchRequestsSchema.safeParse(args)
    if (!parsed.success) {
      throw new ToolError(
        `Invalid arguments: ${parsed.error.issues.map((i) => i.message).join("; ")}`,
        "search_requests",
      )
    }

    const { query, module, status, limit } = parsed.data
    const prisma = getPrisma()

    const requests = await prisma.request.findMany({
      where: {
        title: { contains: query, mode: "insensitive" },
        ...(module ? { module } : {}),
        ...(status ? { status } : {}),
      },
      orderBy: { updatedAt: "desc" },
      take: limit,
      select: {
        id: true,
        module: true,
        title: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        requester: { select: { name: true, email: true } },
      },
    })

    return {
      success: true,
      data: {
        requests: requests.map((r) => ({
          ...formatRequest(r),
          requester: r.requester,
        })),
        count: requests.length,
      },
    }
  },
}
