import { z } from "zod"

export const EVENT_STATUSES = ["new", "in_progress", "delivered", "completed", "cancelled"] as const
export type EventStatus = (typeof EVENT_STATUSES)[number]

export const EventPayloadSchema = z.object({
  requestTitle: z.string().min(1, "Request title is required"),
  description: z.string().optional(),
  eventLocationType: z.enum(["internal", "external"]),
  floorNumber: z.string().optional(),
  area: z.string().optional(),
  addressOrUrl: z.string().optional(),
  eventDate: z.string().min(1, "Event date is required"),
  eventTime: z.string().optional(),
  expectedAttendees: z.number().min(1, "Expected attendees must be at least 1"),
  department: z.string().min(1, "Department is required"),
  organizer: z.string().min(1, "Organizer name is required"),
  budget: z.number().min(0, "Budget must be 0 or more"),
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
    if (!data.area || data.area.trim() === "") {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Area is required for internal events", path: ["area"] })
    }
  }
  if (data.eventLocationType === "external") {
    if (!data.addressOrUrl || data.addressOrUrl.trim() === "") {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Address or location URL is required for external events", path: ["addressOrUrl"] })
    }
  }
})

export type EventPayload = z.infer<typeof EventPayloadSchema>
