import { z } from "zod"

// ─── Travel Types & Transportations ──────────────────────────────────────────

export const TRAVEL_TYPES = ["Domestic", "International"] as const
export const TRANSPORTATION_MODES = ["Flight", "Car", "Train", "Bus", "Other"] as const
export const HOTEL_CLASSES = ["Budget", "3-Star", "4-Star", "5-Star", "Other"] as const
export const TRAVEL_STATUSES = ["new", "pending_approval", "on_hold", "approved", "completed", "cancelled"] as const

export type TravelType = (typeof TRAVEL_TYPES)[number]
export type TransportationMode = (typeof TRANSPORTATION_MODES)[number]
export type HotelClass = (typeof HOTEL_CLASSES)[number]
export type TravelStatus = (typeof TRAVEL_STATUSES)[number]

// ─── Travel Request Schema ───────────────────────────────────────────────────

export const TravelPayloadSchema = z.object({
  tripName: z
    .string()
    .min(3, "Trip name must be at least 3 characters")
    .max(150, "Trip name cannot exceed 150 characters"),
  purpose: z
    .string()
    .min(10, "Purpose must be more detailed (min 10 characters)")
    .max(500, "Purpose cannot exceed 500 characters"),
  travelType: z.enum(TRAVEL_TYPES, { error: "Please select a travel type" }),
  origin: z
    .string()
    .min(2, "Origin must be at least 2 characters")
    .max(100, "Origin cannot exceed 100 characters"),
  destination: z
    .string()
    .min(2, "Destination must be at least 2 characters")
    .max(100, "Destination cannot exceed 100 characters"),
  departureDate: z
    .string()
    .min(1, "Departure date is required")
    .refine((d) => !isNaN(Date.parse(d)), "Departure date must be a valid date")
    .refine((d) => new Date(d) >= new Date(new Date().toDateString()), "Departure date cannot be in the past"),
  returnDate: z
    .string()
    .min(1, "Return date is required")
    .refine((d) => !isNaN(Date.parse(d)), "Return date must be a valid date"),
  transportationMode: z.enum(TRANSPORTATION_MODES, { error: "Please select a transportation mode" }),
  numberOfTravelers: z
    .number()
    .int("Number of travelers must be a whole number")
    .min(1, "Number of travelers must be at least 1")
    .max(500, "Number of travelers cannot exceed 500"),
  hotelRequired: z.boolean().default(false),
  hotelClass: z.enum(HOTEL_CLASSES).optional(),
  mealAllowance: z.boolean().default(false),
  estimatedBudget: z
    .number()
    .min(0, "Budget cannot be negative")
    .max(10_000_000, "Budget cannot exceed 10,000,000")
    .optional(),
  department: z.string().min(2, "Department must be at least 2 characters"),
  manager: z.string().min(2, "Manager name must be at least 2 characters"),
  businessJustification: z
    .string()
    .min(10, "Business justification must be more detailed (min 10 characters)")
    .max(1000, "Business justification cannot exceed 1000 characters"),
  attachments: z.array(z.string()).optional(),
  notes: z.string().max(500, "Notes cannot exceed 500 characters").optional(),
}).superRefine((data, ctx) => {
  if (data.returnDate && data.departureDate && data.returnDate < data.departureDate) {
    ctx.addIssue({
      code: "custom",
      message: "Return date cannot be before departure date",
      path: ["returnDate"],
    })
  }
  if (data.hotelRequired && !data.hotelClass) {
    ctx.addIssue({
      code: "custom",
      message: "Please select a hotel class when hotel is required",
      path: ["hotelClass"],
    })
  }
})

export type TravelPayload = z.infer<typeof TravelPayloadSchema>
