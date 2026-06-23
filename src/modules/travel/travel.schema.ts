import { z } from "zod"

// ─── Travel Request Types ─────────────────────────────────────────────────────

export const TRAVEL_REQUEST_TYPES = ["visa_application", "hotel_flight_reservation"] as const
export const TRAVEL_STATUSES = ["new", "awaiting_approval", "in_progress", "completed", "cancelled"] as const

export type TravelRequestType = (typeof TRAVEL_REQUEST_TYPES)[number]
export type TravelStatus = (typeof TRAVEL_STATUSES)[number]

// ─── Shared Attachment Schema ─────────────────────────────────────────────────

export const AttachmentSchema = z.object({
  id: z.string(),
  name: z.string(),
  url: z.string(),
  mimeType: z.string(),
  sizeBytes: z.number(),
  uploadedAt: z.string(),
})

// ─── Visa Application Schema ──────────────────────────────────────────────────

export const VisaApplicationPayloadSchema = z
  .object({
    requestTitle: z.string().min(1, "Request title is required"),
    travelType: z.literal("visa_application"),
    directManager: z.string().min(1, "Direct Manager is required"),
    costCenter: z.string().min(1, "Cost Center is required"),
    description: z.string().max(1000).optional(),
    items: z.array(z.enum(["Visa"])).min(1, "Visa is required"),
    // Required attachments for visa
    visaDocument: AttachmentSchema,
    amanSticker: AttachmentSchema,
    passport: AttachmentSchema,
    // Optional additional attachments
    additionalAttachments: z.array(AttachmentSchema).default([]),
    ccEmails: z.array(z.string().email()).default([]),
    notes: z.string().max(500).optional(),
  })
  .strict()

// ─── Hotel & Flight Reservation Schema ────────────────────────────────────────

export const HotelFlightReservationPayloadSchema = z
  .object({
    requestTitle: z.string().min(1, "Request title is required"),
    travelType: z.literal("hotel_flight_reservation"),
    directManager: z.string().min(1, "Direct Manager is required"),
    costCenter: z.string().min(1, "Cost Center is required"),
    description: z.string().max(1000).optional(),
    items: z
      .array(z.enum(["Visa", "Hotel", "Flight"]))
      .min(1, "Select at least one item (Visa, Hotel, or Flight)"),
    // Conditional: Hotel fields
    hotelUrl: z.union([z.literal(""), z.string().url("Please enter a valid URL")]).optional(),
    // Conditional: Flight fields
    flightCompany: z.string().optional(),
    flightPhoto: AttachmentSchema.optional(),
    // Required attachments
    travelRequestForm: AttachmentSchema,
    amanSticker: AttachmentSchema,
    passport: AttachmentSchema,
    // Optional additional attachments
    additionalAttachments: z.array(AttachmentSchema).default([]),
    ccEmails: z.array(z.string().email()).default([]),
    notes: z.string().max(500).optional(),
  })
  .superRefine((val, ctx) => {
    // If Hotel is checked, no additional validation needed (hotelUrl is optional)
    // If Flight is checked, at least one of flightCompany or flightPhoto is required
    if (val.items.includes("Flight")) {
      const hasFlightCompany = val.flightCompany && val.flightCompany.trim()
      const hasFlightPhoto = val.flightPhoto !== undefined && val.flightPhoto !== null

      if (!hasFlightCompany && !hasFlightPhoto) {
        ctx.addIssue({
          code: "custom",
          message: "Flight Company name or Flight Photo is required when Flight is selected",
          path: ["flightCompany"],
        })
      }
    }
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
    directManager: z.string().min(1, "Direct Manager is required"),
    costCenter: z.string().min(1, "Cost Center is required"),
    description: z.string().max(1000).optional(),
    items: z.array(z.enum(["Visa"])).min(1, "Visa is required"),
    // Required attachments for visa
    visaDocument: z
      .object({
        name: z.string(),
        url: z.string(),
        mimeType: z.string(),
        sizeBytes: z.number(),
        uploadedAt: z.string(),
      })
      .refine((att) => att.url, "Visa document is required"),
    amanSticker: z
      .object({
        name: z.string(),
        url: z.string(),
        mimeType: z.string(),
        sizeBytes: z.number(),
        uploadedAt: z.string(),
      })
      .refine((att) => att.url, "Aman sticker is required"),
    passport: z
      .object({
        name: z.string(),
        url: z.string(),
        mimeType: z.string(),
        sizeBytes: z.number(),
        uploadedAt: z.string(),
      })
      .refine((att) => att.url, "Passport is required"),
    // Optional additional attachments
    additionalAttachments: z.array(z.object({
      name: z.string(),
      url: z.string(),
      mimeType: z.string(),
      sizeBytes: z.number(),
      uploadedAt: z.string(),
    })).default([]),
    ccEmails: z.array(z.string().email()).default([]),
    notes: z.string().max(500).optional(),
  })
  .strict()

export const HotelFlightReservationFormSchema = z
  .object({
    requestTitle: z.string().min(1, "Request title is required"),
    travelType: z.literal("hotel_flight_reservation"),
    directManager: z.string().min(1, "Direct Manager is required"),
    costCenter: z.string().min(1, "Cost Center is required"),
    description: z.string().max(1000).optional(),
    items: z
      .array(z.enum(["Visa", "Hotel", "Flight"]))
      .min(1, "Select at least one item (Visa, Hotel, or Flight)"),
    // Conditional: Hotel fields
    hotelUrl: z.union([z.literal(""), z.string().url("Please enter a valid URL")]).optional(),
    // Conditional: Flight fields
    flightCompany: z.string().optional(),
    flightPhoto: z.object({
      name: z.string(),
      url: z.string(),
      mimeType: z.string(),
      sizeBytes: z.number(),
      uploadedAt: z.string(),
    }).optional(),
    // Required attachments
    travelRequestForm: z
      .object({
        name: z.string(),
        url: z.string(),
        mimeType: z.string(),
        sizeBytes: z.number(),
        uploadedAt: z.string(),
      })
      .refine((att) => att.url, "Travel request form is required"),
    amanSticker: z
      .object({
        name: z.string(),
        url: z.string(),
        mimeType: z.string(),
        sizeBytes: z.number(),
        uploadedAt: z.string(),
      })
      .refine((att) => att.url, "Aman sticker is required"),
    passport: z
      .object({
        name: z.string(),
        url: z.string(),
        mimeType: z.string(),
        sizeBytes: z.number(),
        uploadedAt: z.string(),
      })
      .refine((att) => att.url, "Passport is required"),
    // Optional additional attachments
    additionalAttachments: z.array(z.object({
      name: z.string(),
      url: z.string(),
      mimeType: z.string(),
      sizeBytes: z.number(),
      uploadedAt: z.string(),
    })).default([]),
    ccEmails: z.array(z.string().email()).default([]),
    notes: z.string().max(500).optional(),
  })
  .superRefine((val, ctx) => {
    // If Flight is checked, at least one of flightCompany or flightPhoto is required
    if (val.items.includes("Flight")) {
      const hasFlightCompany = val.flightCompany && val.flightCompany.trim()
      const hasFlightPhoto = val.flightPhoto !== undefined && val.flightPhoto !== null

      if (!hasFlightCompany && !hasFlightPhoto) {
        ctx.addIssue({
          code: "custom",
          message: "Flight Company name or Flight Photo is required when Flight is selected",
          path: ["flightCompany"],
        })
      }
    }
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
