import { z } from "zod"

// ─── Event Types & Capacities ─────────────────────────────────────────────────

export const EVENT_TYPES = ["Team Building", "Training", "Conference", "Workshop", "Social", "Other"] as const
export const VENUE_TYPES = ["In-Office", "External", "Hybrid"] as const
export const EVENT_STATUSES = ["new", "pending", "on_hold", "in_transit", "completed", "cancelled"] as const

export type EventType = (typeof EVENT_TYPES)[number]
export type VenueType = (typeof VENUE_TYPES)[number]
export type EventStatus = (typeof EVENT_STATUSES)[number]

// ─── Event Request Schema ────────────────────────────────────────────────────

export const EventPayloadSchema = z.object({
  eventName: z
    .string()
    .min(3, "Event name must be at least 3 characters")
    .max(150, "Event name cannot exceed 150 characters"),
  description: z
    .string()
    .min(10, "Please describe the event in more detail (min 10 characters)")
    .max(1000, "Description cannot exceed 1000 characters"),
  eventType: z.enum(EVENT_TYPES, { error: "Please select an event type" }),
  eventDate: z
    .string()
    .min(1, "Event date is required")
    .refine((d) => !isNaN(Date.parse(d)), "Event date must be a valid date")
    .refine((d) => new Date(d) >= new Date(new Date().toDateString()), "Event date cannot be in the past"),
  startTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Start time must be in HH:MM format")
    .optional()
    .or(z.literal("")),
  endTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "End time must be in HH:MM format")
    .optional()
    .or(z.literal("")),
  venue: z
    .string()
    .min(3, "Venue must be at least 3 characters")
    .max(150, "Venue cannot exceed 150 characters"),
  venueType: z.enum(VENUE_TYPES, { error: "Please select a venue type" }),
  expectedAttendees: z
    .number()
    .int("Expected attendees must be a whole number")
    .min(1, "Expected attendees must be at least 1")
    .max(10000, "Expected attendees cannot exceed 10,000"),
  department: z.string().min(2, "Department must be at least 2 characters"),
  budget: z
    .number()
    .min(0, "Budget cannot be negative")
    .max(10_000_000, "Budget cannot exceed 10,000,000")
    .optional(),
  contactPerson: z.string().min(2, "Contact person name must be at least 2 characters").optional().or(z.literal("")),
  contactPhone: z
    .string()
    .regex(/^\d{11}$/, "Phone number must be exactly 11 digits (e.g. 01012345678)")
    .optional()
    .or(z.literal("")),
  specialRequirements: z.string().max(500, "Special requirements cannot exceed 500 characters").optional(),
  attachments: z.array(z.string()).optional(),
  notes: z.string().max(500, "Notes cannot exceed 500 characters").optional(),
}).superRefine((data, ctx) => {
  if (data.startTime && data.endTime && data.startTime >= data.endTime) {
    ctx.addIssue({
      code: "custom",
      message: "End time must be after start time",
      path: ["endTime"],
    })
  }
})

export type EventPayload = z.infer<typeof EventPayloadSchema>
