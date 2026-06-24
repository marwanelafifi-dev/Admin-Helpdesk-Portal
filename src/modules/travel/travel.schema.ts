import { z } from "zod"

// ─── Travel Request Types ─────────────────────────────────────────────────────

export const TRAVEL_REQUEST_TYPES = ["visa_application", "hotel_flight_reservation"] as const
export const TRAVEL_STATUSES = ["new", "awaiting_approval", "in_progress", "completed", "cancelled"] as const
export const CURRENCIES = ["EGP", "USD", "EUR", "GBP", "AED", "SAR"] as const
export const PAYMENT_METHODS = ["cash", "company_credit_card", "both"] as const

export type TravelRequestType = (typeof TRAVEL_REQUEST_TYPES)[number]
export type TravelStatus = (typeof TRAVEL_STATUSES)[number]
export type Currency = (typeof CURRENCIES)[number]
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]

// ─── Shared Attachment Schema ─────────────────────────────────────────────────

export const AttachmentSchema = z.object({
  id: z.string(),
  name: z.string(),
  url: z.string(),
  mimeType: z.string(),
  sizeBytes: z.number(),
  uploadedAt: z.string(),
})

export const TRIP_SERVICES = ["Hotel", "Flight"] as const
export type TripService = (typeof TRIP_SERVICES)[number]

// ─── Trip Details Schema (shared for both types) ───────────────────────────────

const TripDetailsSchema = z.object({
  division: z.string().min(1, "Division is required"),
  purposeOfTrip: z.string().min(1, "Purpose of Trip is required").max(500),
  destination: z.string().min(1, "Destination is required"),
  dateFrom: z.string().min(1, "Date From is required"),
  dateTo: z.string().min(1, "Date To is required"),
  // Multi-select services
  tripServices: z.array(z.enum(TRIP_SERVICES)).default([]),
  // Hotel fields (shown when Hotel selected)
  hotelNameOrLink: z.string().optional(),
  hotelPhoto: AttachmentSchema.optional().nullable(),
  // Flight fields (shown when Flight selected)
  flightNameOrLink: z.string().optional(),
  flightPhoto: AttachmentSchema.optional().nullable(),
  amanSticker: AttachmentSchema,
  passport: AttachmentSchema,
})

// ─── Trip Costs Schema ─────────────────────────────────────────────────────────

const TripCostsSchema = z.object({
  tripAllowance: z.number().min(0, "Trip Allowance must be non-negative"),
  airTicket: z.number().min(0, "Air Ticket must be non-negative"),
  hotel: z.number().min(0, "Hotel must be non-negative"),
  transportationCarRental: z.number().min(0, "Transportation/Car Rental must be non-negative"),
  others: z.string().max(500).optional(),
  othersAmount: z.number().min(0, "Others amount must be non-negative").default(0),
  currency: z.enum(CURRENCIES),
  estimatedTotalCosts: z.number().min(0),
})

// ─── Payment Method Schema ─────────────────────────────────────────────────────

const PaymentMethodSchema = z.object({
  paymentMethod: z.enum(PAYMENT_METHODS, {
    errorMap: () => ({ message: "Payment method is required" })
  }),
  paymentCurrency: z.enum(CURRENCIES),
  paymentAmount: z.number().min(0).default(0),
  cashAmount: z.number().min(0).default(0),
  creditCardAmount: z.number().min(0).default(0),
})

// ─── Visa Application Payload Schema ───────────────────────────────────────────

export const VisaApplicationPayloadSchema = z
  .object({
    requestTitle: z.string().min(1, "Request title is required"),
    travelType: z.literal("visa_application"),
    authorizedManager: z.string().min(1, "Authorized Manager is required"),
    costCenter: z.string().min(1, "Cost Center is required"),
    ...TripDetailsSchema.shape,
    ...TripCostsSchema.shape,
    ...PaymentMethodSchema.shape,
    additionalAttachments: z.array(AttachmentSchema).default([]),
    ccEmails: z.array(z.string().email()).default([]),
    notes: z.string().max(500).optional(),
  })
  .strict()

// ─── Hotel & Flight Reservation Payload Schema ─────────────────────────────────

export const HotelFlightReservationPayloadSchema = z
  .object({
    requestTitle: z.string().min(1, "Request title is required"),
    travelType: z.literal("hotel_flight_reservation"),
    authorizedManager: z.string().min(1, "Authorized Manager is required"),
    costCenter: z.string().min(1, "Cost Center is required"),
    ...TripDetailsSchema.shape,
    ...TripCostsSchema.shape,
    ...PaymentMethodSchema.shape,
    additionalAttachments: z.array(AttachmentSchema).default([]),
    ccEmails: z.array(z.string().email()).default([]),
    notes: z.string().max(500).optional(),
  })
  .strict()

// ─── Combined Travel Payload ──────────────────────────────────────────────────

export const TravelPayloadSchema = z.discriminatedUnion("travelType", [
  VisaApplicationPayloadSchema,
  HotelFlightReservationPayloadSchema,
])

// ─── Form Schemas (Input) ────────────────────────────────────────────────────

export const VisaApplicationFormSchema = z
  .object({
    requestTitle: z.string().min(1, "Request title is required"),
    travelType: z.literal("visa_application"),
    authorizedManager: z.string().min(1, "Authorized Manager is required"),
    costCenter: z.string().min(1, "Cost Center is required"),
    division: z.string().min(1, "Division is required"),
    purposeOfTrip: z.string().min(1, "Purpose of Trip is required").max(500),
    destination: z.string().min(1, "Destination is required"),
    dateFrom: z.string().min(1, "Date From is required"),
    dateTo: z.string().min(1, "Date To is required"),
    tripServices: z.array(z.enum(TRIP_SERVICES)).default([]),
    hotelNameOrLink: z.string().optional(),
    hotelPhoto: z.any().optional(),
    flightNameOrLink: z.string().optional(),
    flightPhoto: z.any().optional(),
    amanSticker: z.any().optional(),
    passport: z.any().optional(),
    tripAllowance: z.union([z.string(), z.number()]).default(0).transform(v => Number(v) || 0),
    airTicket: z.union([z.string(), z.number()]).default(0).transform(v => Number(v) || 0),
    hotel: z.union([z.string(), z.number()]).default(0).transform(v => Number(v) || 0),
    transportationCarRental: z.union([z.string(), z.number()]).default(0).transform(v => Number(v) || 0),
    others: z.string().max(500).optional(),
    othersAmount: z.union([z.string(), z.number()]).default(0).transform(v => Number(v) || 0),
    currency: z.enum(CURRENCIES),
    estimatedTotalCosts: z.union([z.string(), z.number()]).transform(v => Number(v) || 0),
    paymentMethod: z.enum(PAYMENT_METHODS, { errorMap: () => ({ message: "Payment method is required" }) }),
    paymentAmount: z.union([z.string(), z.number()]).default(0).transform(v => Number(v) || 0),
    cashAmount: z.union([z.string(), z.number()]).default(0).transform(v => Number(v) || 0),
    creditCardAmount: z.union([z.string(), z.number()]).default(0).transform(v => Number(v) || 0),
    paymentCurrency: z.enum(CURRENCIES),
    additionalAttachments: z.any().optional(),
    ccEmails: z.array(z.string().email()).default([]),
    notes: z.string().max(500).optional(),
  })
  .strict()

export const HotelFlightReservationFormSchema = z
  .object({
    requestTitle: z.string().min(1, "Request title is required"),
    travelType: z.literal("hotel_flight_reservation"),
    authorizedManager: z.string().min(1, "Authorized Manager is required"),
    costCenter: z.string().min(1, "Cost Center is required"),
    division: z.string().min(1, "Division is required"),
    purposeOfTrip: z.string().min(1, "Purpose of Trip is required").max(500),
    destination: z.string().min(1, "Destination is required"),
    dateFrom: z.string().min(1, "Date From is required"),
    dateTo: z.string().min(1, "Date To is required"),
    tripServices: z.array(z.enum(TRIP_SERVICES)).default([]),
    hotelNameOrLink: z.string().optional(),
    hotelPhoto: z.any().optional(),
    flightNameOrLink: z.string().optional(),
    flightPhoto: z.any().optional(),
    amanSticker: z.any().optional(),
    passport: z.any().optional(),
    tripAllowance: z.union([z.string(), z.number()]).default(0).transform(v => Number(v) || 0),
    airTicket: z.union([z.string(), z.number()]).default(0).transform(v => Number(v) || 0),
    hotel: z.union([z.string(), z.number()]).default(0).transform(v => Number(v) || 0),
    transportationCarRental: z.union([z.string(), z.number()]).default(0).transform(v => Number(v) || 0),
    others: z.string().max(500).optional(),
    othersAmount: z.union([z.string(), z.number()]).default(0).transform(v => Number(v) || 0),
    currency: z.enum(CURRENCIES),
    estimatedTotalCosts: z.union([z.string(), z.number()]).transform(v => Number(v) || 0),
    paymentMethod: z.enum(PAYMENT_METHODS, { errorMap: () => ({ message: "Payment method is required" }) }),
    paymentAmount: z.union([z.string(), z.number()]).default(0).transform(v => Number(v) || 0),
    cashAmount: z.union([z.string(), z.number()]).default(0).transform(v => Number(v) || 0),
    creditCardAmount: z.union([z.string(), z.number()]).default(0).transform(v => Number(v) || 0),
    paymentCurrency: z.enum(CURRENCIES),
    additionalAttachments: z.any().optional(),
    ccEmails: z.array(z.string().email()).default([]),
    notes: z.string().max(500).optional(),
  })
  .strict()

// ─── Combined Travel Form Schema ──────────────────────────────────────────────

export const TravelFormSchema = z.discriminatedUnion("travelType", [
  VisaApplicationFormSchema,
  HotelFlightReservationFormSchema,
])

// ─── Type Exports ───────────────────────────────────────────────────────────

export type Attachment = z.infer<typeof AttachmentSchema>
export type VisaApplicationPayload = z.infer<typeof VisaApplicationPayloadSchema>
export type HotelFlightReservationPayload = z.infer<typeof HotelFlightReservationPayloadSchema>
export type TravelPayload = z.infer<typeof TravelPayloadSchema>
export type VisaApplicationForm = z.infer<typeof VisaApplicationFormSchema>
export type HotelFlightReservationForm = z.infer<typeof HotelFlightReservationFormSchema>
export type TravelForm = z.infer<typeof TravelFormSchema>
