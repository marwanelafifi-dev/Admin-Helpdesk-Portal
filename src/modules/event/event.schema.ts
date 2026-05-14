import { z } from "zod"

export const EVENT_TYPES = ["Conference", "Workshop", "Team Building", "Webinar", "Training", "Other"] as const
export const EVENT_STATUSES = ["new", "on_hold", "in_transit", "completed"] as const

export type EventType = (typeof EVENT_TYPES)[number]
export type EventStatus = (typeof EVENT_STATUSES)[number]

export const EventPayloadSchema = z.object({
  requestTitle: z.string().min(1, "Request title is required"),
  eventName: z.string().min(1, "Event name is required"),
  eventType: z.enum(EVENT_TYPES),
  description: z.string().min(1, "Description is required"),
  eventDate: z.string().min(1, "Event date is required"),
  eventTime: z.string().optional(),
  location: z.string().min(1, "Location is required"),
  expectedAttendees: z.number().min(1, "Expected attendees must be at least 1"),
  budget: z.number().min(0, "Budget must be positive"),
  department: z.string().min(1, "Department is required"),
  organizer: z.string().min(1, "Organizer name is required"),
  attachments: z.array(z.string()).optional(),
  notes: z.string().max(500).optional(),
  ccEmails: z.array(z.string().email()).default([]),
})

export type EventPayload = z.infer<typeof EventPayloadSchema>
