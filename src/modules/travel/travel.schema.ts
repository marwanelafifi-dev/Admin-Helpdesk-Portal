import { z } from "zod"

export const TRAVEL_TYPES = ["Domestic", "International"] as const
export const TRAVEL_CLASS = ["Economy", "Business", "First Class"] as const
export const TRAVEL_STATUSES = ["new", "on_hold", "completed"] as const

export type TravelType = (typeof TRAVEL_TYPES)[number]
export type TravelClass = (typeof TRAVEL_CLASS)[number]
export type TravelStatus = (typeof TRAVEL_STATUSES)[number]

export const TravelPayloadSchema = z.object({
  requestTitle: z.string().min(1, "Request title is required"),
  tripName: z.string().min(1, "Trip name is required"),
  travelerName: z.string().min(1, "Traveler name is required"),
  travelType: z.enum(TRAVEL_TYPES),
  origin: z.string().min(1, "Origin city is required"),
  destination: z.string().min(1, "Destination city is required"),
  departureDate: z.string().min(1, "Departure date is required"),
  returnDate: z.string().optional(),
  flightClass: z.enum(TRAVEL_CLASS),
  estimatedCost: z.number().min(0, "Estimated cost must be positive"),
  purpose: z.string().min(1, "Purpose of travel is required"),
  department: z.string().min(1, "Department is required"),
  approver: z.string().min(1, "Manager approval required"),
  attachments: z.array(z.string()).optional(),
  notes: z.string().max(500).optional(),
})

export type TravelPayload = z.infer<typeof TravelPayloadSchema>
