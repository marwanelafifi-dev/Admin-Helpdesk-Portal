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
  requestTitle: z.string().min(1, "Request title is required"),
  issueTitle: z.string().min(1, "Issue title is required"),
  description: z.string().min(1, "Description is required"),
  priority: z.enum(MAINTENANCE_PRIORITIES),
  category: z.enum(MAINTENANCE_CATEGORIES),
  floorNumber: z.enum(FLOOR_NUMBERS),
  roomArea: z.string().min(1, "Room/Area is required"),
  attachments: z.array(z.object({
    id: z.string(),
    name: z.string(),
    url: z.string(),
    mimeType: z.string(),
    sizeBytes: z.number(),
    uploadedAt: z.string(),
  })).optional(),
  notes: z.string().max(500).optional(),
  ccEmails: z.array(z.string().email()).default([]),
})

export type MaintenancePayload = z.infer<typeof MaintenancePayloadSchema>
