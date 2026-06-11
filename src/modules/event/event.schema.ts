import { z } from "zod"
import { FLOOR_NUMBERS } from "@/modules/maintenance/maintenance.schema"

export { FLOOR_NUMBERS }

export const EVENT_STATUSES = ["new", "in_progress", "delivered", "completed", "cancelled"] as const
export type EventStatus = (typeof EVENT_STATUSES)[number]

export const EventPayloadSchema = z.object({
  requestTitle: z.string().min(1, "Request title is required"),
  description: z.string().optional(),
  eventLocationType: z.enum(["internal", "external"]),
  floorNumber: z.string().optional(),
  roomArea: z.string().optional(),
  addressOrUrl: z.string().optional(),
  eventDate: z.string().min(1, "Event date is required"),
  eventTime: z.string().optional(),
  expectedAttendees: z.number().min(1, "Expected attendees must be at least 1"),
  department: z.string().min(1, "Department is required"),
  notes: z.string().max(500).optional(),
  attachments: z.array(z.object({
    id: z.string(),
    name: z.string(),
    url: z.string(),
    mimeType: z.string(),
    sizeBytes: z.number(),
    uploadedAt: z.string(),
  })).optional(),
  ccEmails: z.array(z.string().email()).default([]),
}).superRefine((data, ctx) => {
  if (data.eventLocationType === "internal") {
    if (!data.floorNumber || data.floorNumber.trim() === "") {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Floor number is required for internal events", path: ["floorNumber"] })
    }
    if (!data.roomArea || data.roomArea.trim() === "") {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Room/Area is required for internal events", path: ["roomArea"] })
    }
  }
  if (data.eventLocationType === "external") {
    if (!data.addressOrUrl || data.addressOrUrl.trim() === "") {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Address or location URL is required for external events", path: ["addressOrUrl"] })
    }
  }
})

export type EventPayload = z.infer<typeof EventPayloadSchema>
