import { z } from "zod"

// ─── Maintenance Categories & Priorities ──────────────────────────────────────

export const MAINTENANCE_CATEGORIES = ["AC", "Electrical", "Cube/Desk", "Fire System", "Other"] as const
export const MAINTENANCE_PRIORITIES = ["Low", "Medium", "High", "Critical"] as const
export const FLOOR_NUMBERS = ["Floor 1", "Floor 2", "Floor 3", "Floor 4", "Floor 5"] as const

export type MaintenanceCategory = (typeof MAINTENANCE_CATEGORIES)[number]
export type MaintenancePriority = (typeof MAINTENANCE_PRIORITIES)[number]
export type FloorNumber = (typeof FLOOR_NUMBERS)[number]

// ─── Maintenance Request Schema ────────────────────────────────────────────────

export const MaintenancePayloadSchema = z.object({
  issueTitle: z
    .string()
    .min(3, "Issue title must be at least 3 characters")
    .max(100, "Issue title cannot exceed 100 characters"),
  description: z
    .string()
    .min(10, "Please describe the issue in more detail (min 10 characters)")
    .max(1000, "Description cannot exceed 1000 characters"),
  priority: z.enum(MAINTENANCE_PRIORITIES, { error: "Please select a priority" }),
  category: z.enum(MAINTENANCE_CATEGORIES, { error: "Please select a category" }),
  floorNumber: z.enum(FLOOR_NUMBERS, { error: "Please select a floor" }),
  roomArea: z
    .string()
    .min(2, "Room/Area must be at least 2 characters")
    .max(100, "Room/Area cannot exceed 100 characters"),
  attachments: z.array(z.string()).optional(),
  notes: z.string().max(500, "Notes cannot exceed 500 characters").optional(),
})

export type MaintenancePayload = z.infer<typeof MaintenancePayloadSchema>
