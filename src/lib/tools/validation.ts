import { z } from "zod"

// ─── Shared ───────────────────────────────────────────────────────────────────

export const requestStatusSchema = z.enum([
  "draft",
  "new",
  "on_hold",
  "in_customs",
  "in_transit",
  "delivered",
  "completed",
  "cancelled",
  "pending_assignment",
  "assigned",
  "awaiting_input",
  "resolved",
  "closed",
])

export type RequestStatus = z.infer<typeof requestStatusSchema>

export const moduleSchema = z.enum([
  "shipping",
  "maintenance",
  "purchase",
  "event",
  "travel",
  "hr",
])

// ─── submit_request ───────────────────────────────────────────────────────────

/**
 * The AI must supply module + title + an arbitrary payload object.
 * Per-module field validation happens inside the tool itself so the model gets
 * a specific error message it can relay back to the user.
 */
export const submitRequestSchema = z.object({
  module: moduleSchema,
  title: z
    .string()
    .min(3, "Title must be at least 3 characters")
    .max(200, "Title must be at most 200 characters")
    .trim(),
  payload: z.record(z.string(), z.unknown()),
})

export type SubmitRequestInput = z.infer<typeof submitRequestSchema>

// ─── get_my_requests ─────────────────────────────────────────────────────────

export const getMyRequestsSchema = z.object({
  module: moduleSchema.optional(),
  status: requestStatusSchema.optional().describe(
    "Filter by status slug, e.g. 'new', 'on_hold', 'completed'",
  ),
  limit: z.number().int().min(1).max(20).default(10),
  offset: z.number().int().min(0).default(0),
})

export type GetMyRequestsInput = z.infer<typeof getMyRequestsSchema>

// ─── get_request_details ──────────────────────────────────────────────────────

export const getRequestDetailsSchema = z.object({
  requestId: z.string().min(1, "requestId is required"),
})

export type GetRequestDetailsInput = z.infer<typeof getRequestDetailsSchema>

// ─── search_requests (admin / manager) ───────────────────────────────────────

export const searchRequestsSchema = z.object({
  query: z
    .string()
    .min(1, "Search query must not be empty")
    .max(100, "Search query too long")
    .trim(),
  module: moduleSchema.optional(),
  status: requestStatusSchema.optional(),
  limit: z.number().int().min(1).max(20).default(10),
})

export type SearchRequestsInput = z.infer<typeof searchRequestsSchema>

// ─── get_platform_stats (admin / manager) ────────────────────────────────────

export const getPlatformStatsSchema = z.object({
  days: z
    .number()
    .int()
    .min(1, "days must be at least 1")
    .max(365, "days must be at most 365")
    .default(30),
})

export type GetPlatformStatsInput = z.infer<typeof getPlatformStatsSchema>
