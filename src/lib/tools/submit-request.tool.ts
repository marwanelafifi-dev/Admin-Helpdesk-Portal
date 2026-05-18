import type { Prisma } from "@prisma/client"
import { getPrisma } from "@/server/engine/prisma"
import type { AgentTool, ToolContext, ToolResult } from "@/lib/agent/types"
import { ToolError } from "@/lib/errors"
import { submitRequestSchema } from "./validation"
import { HRPayloadSchema } from "@/modules/hr/hr.schema"

// ─── Per-module required-field validation ─────────────────────────────────────

const REQUIRED_FIELDS: Record<string, string[]> = {
  shipping:    ["recipientName", "recipientAddress", "carrier", "description"],
  maintenance: ["location", "issueDescription", "priority"],
  purchase:    ["itemDescription", "quantity", "estimatedPrice", "supplier"],
  event:       ["eventDate", "eventLocation", "attendeesCount", "eventDescription"],
  travel:      ["destination", "travelDate", "returnDate", "travelPurpose"],
  hr:          ["hrType", "employeeName", "employeeId", "department"],
}

function validatePayload(module: string, payload: Record<string, unknown>): string | null {
  if (module === "hr") {
    const parsed = HRPayloadSchema.safeParse(payload)
    if (!parsed.success) {
      const issues = parsed.error.issues.map((issue) => {
        const field = issue.path.join(".") || "payload"
        return `${field}: ${issue.message}`
      })
      return `Missing or invalid HR fields: ${issues.join("; ")}`
    }
    return null
  }

  const required = REQUIRED_FIELDS[module] ?? []
  const missing = required.filter(
    (field) => payload[field] === undefined || payload[field] === null || payload[field] === "",
  )
  return missing.length > 0
    ? `Missing required fields for ${module}: ${missing.join(", ")}`
    : null
}

// ─── Tool result data shape ───────────────────────────────────────────────────

interface SubmitResult {
  requestId: string
  module: string
  title: string
  status: string
}

// ─── Tool definition & implementation ─────────────────────────────────────────

export const submitRequestTool: AgentTool = {
  definition: {
    type: "function",
    function: {
      name: "submit_request",
      description:
        "Create a new administrative request on behalf of the authenticated user. " +
        "ONLY call this tool after you have shown the user a complete summary and " +
        "they have explicitly confirmed with 'yes' or 'نعم'.",
      parameters: {
        type: "object",
        properties: {
          module: {
            type: "string",
            enum: ["shipping", "maintenance", "purchase", "event", "travel", "hr"],
            description: "The category of the request.",
          },
          title: {
            type: "string",
            description: "A short, descriptive title (3–200 characters).",
          },
          payload: {
            type: "object",
            description:
              "All collected field values for this module. " +
              "Must include every required field listed in your instructions.",
          },
        },
        required: ["module", "title", "payload"],
      },
    },
  },

  async execute(args: unknown, ctx: ToolContext): Promise<ToolResult<SubmitResult>> {
    // 1. Schema validation
    const parsed = submitRequestSchema.safeParse(args)
    if (!parsed.success) {
      throw new ToolError(
        `Invalid arguments: ${parsed.error.issues.map((i) => i.message).join("; ")}`,
        "submit_request",
      )
    }

    const { module, title, payload } = parsed.data

    // 2. Per-module required-field check
    const fieldError = validatePayload(module, payload as Record<string, unknown>)
    if (fieldError) {
      throw new ToolError(fieldError, "submit_request")
    }

    const prisma = getPrisma()

    // 3. Persist the request
    const newRequest = await prisma.request.create({
      data: {
        module,
        title,
        status: "new",
        payload: payload as Prisma.InputJsonValue,
        requesterId: ctx.userId,
        statusHistory: [
          {
            status: "new",
            changedBy: ctx.userId,
            changedByName: ctx.userName || ctx.userEmail,
            changedAt: new Date().toISOString(),
            comment: "Submitted via AI Assistant",
          },
        ] as Prisma.InputJsonValue,
      },
    })

    // 4. Notify admins — fire-and-forget so it doesn't slow the response
    void notifyAdmins(prisma, newRequest.id, module, title, ctx).catch((err: unknown) =>
      console.error("[submit_request] notification error:", err),
    )

    return {
      success: true,
      data: {
        requestId: newRequest.id,
        module,
        title,
        status: "new",
      },
    }
  },
}

// ─── Helper ───────────────────────────────────────────────────────────────────

async function notifyAdmins(
  prisma: ReturnType<typeof getPrisma>,
  requestId: string,
  module: string,
  title: string,
  ctx: ToolContext,
) {
  const admins = await prisma.user.findMany({
    where: { role: { in: ["admin", "super_admin"] } },
    select: { id: true },
  })
  if (admins.length === 0) return

  await prisma.notification.createMany({
    data: admins.map((admin) => ({
      type: "admin_alert" as const,
      title: `New ${module} Request: ${title}`,
      message: `${ctx.userName || ctx.userEmail} submitted a request via AI Assistant.`,
      userId: admin.id,
      requestId,
      link: `/${module}/${requestId}`,
    })),
  })
}
