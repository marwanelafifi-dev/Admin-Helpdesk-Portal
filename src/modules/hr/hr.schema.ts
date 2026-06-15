import { z } from "zod"

// ─── Onboarding Items ─────────────────────────────────────────────────────────

export const ONBOARDING_ITEMS = [
  "Medical Insurance for New Hire",
  "Access Card",
  "Seating Assignment",
] as const

export const OFFBOARDING_ITEMS = [
  "Desk/Office",
  "Farewell",
  "Close Medical for Leaver",
  "Collect Access Card",
] as const

export const HR_STATUSES = ["new", "on_hold", "completed"] as const

export const EMPLOYMENT_TYPES = ["Full Time", "Part Time", "Fixed Hours", "Internship", "Consultant/Freelancer"] as const
export const ENTITIES = ["USA", "KSA", "Egypt", "France"] as const

export type HRStatus = (typeof HR_STATUSES)[number]
export type HRType = "onboarding" | "offboarding"

// ─── Onboarding Schema ────────────────────────────────────────────────────────

export const OnboardingPayloadSchema = z.object({
  requestTitle: z.string().min(1, "Request title is required"),
  hrType: z.literal("onboarding"),
  employeeName: z.string().min(1, "Employee name is required"),
  employeeId: z.string().min(1, "Employee ID is required"),
  mobileNumber: z.string().min(1, "Mobile number is required"),
  nationalIdNumber: z.string().min(1, "National ID number is required"),
  jobTitle: z.string().optional(),
  employmentType: z.enum(EMPLOYMENT_TYPES),
  directManager: z.string().optional(),
  sector: z.string().optional(),
  department: z.string().min(1, "Department is required"),
  entity: z.enum(ENTITIES),
  startDate: z.string().min(1, "Start date is required"),
  items: z
    .array(z.enum(ONBOARDING_ITEMS))
    .min(1, "Select at least one onboarding item"),
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

// ─── Offboarding Schema ───────────────────────────────────────────────────────

export const OffboardingPayloadSchema = z.object({
  requestTitle: z.string().min(1, "Request title is required"),
  hrType: z.literal("offboarding"),
  employeeName: z.string().min(1, "Employee name is required"),
  employeeId: z.string().min(1, "Employee ID is required"),
  jobTitle: z.string().optional(),
  employmentType: z.enum(EMPLOYMENT_TYPES),
  directManager: z.string().optional(),
  department: z.string().min(1, "Department is required"),
  sector: z.string().min(1, "Sector is required"),
  lastWorkingDay: z.string().min(1, "Last working day is required"),
  items: z
    .array(z.enum(OFFBOARDING_ITEMS))
    .min(1, "Select at least one offboarding item"),
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

// ─── Combined HR Payload ──────────────────────────────────────────────────────

export const HRPayloadSchema = z.discriminatedUnion("hrType", [
  OnboardingPayloadSchema,
  OffboardingPayloadSchema,
])

export type OnboardingPayload = z.infer<typeof OnboardingPayloadSchema>
export type OffboardingPayload = z.infer<typeof OffboardingPayloadSchema>
export type HRPayload = z.infer<typeof HRPayloadSchema>
