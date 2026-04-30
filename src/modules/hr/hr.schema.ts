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

// ─── Reusable field validators ────────────────────────────────────────────────

const egyptianMobileRegex = /^\d{11}$/
const nationalIdRegex = /^\d{14}$/
const employeeIdRegex = /^[A-Za-z0-9\-_]+$/

// ─── Onboarding Schema ────────────────────────────────────────────────────────

export const OnboardingPayloadSchema = z.object({
  hrType: z.literal("onboarding"),
  employeeName: z
    .string()
    .min(2, "Employee name must be at least 2 characters"),
  employeeId: z
    .string()
    .min(1, "Employee ID is required")
    .regex(employeeIdRegex, "Employee ID must only contain letters, numbers, hyphens, or underscores"),
  mobileNumber: z
    .string()
    .regex(egyptianMobileRegex, "Mobile number must be exactly 11 digits (e.g. 01012345678)"),
  nationalIdNumber: z
    .string()
    .regex(nationalIdRegex, "National ID must be exactly 14 digits"),
  jobTitle: z.string().min(2, "Job title must be at least 2 characters").optional(),
  employmentType: z.enum(EMPLOYMENT_TYPES),
  directManager: z.string().min(2, "Manager name must be at least 2 characters").optional(),
  sector: z.string().optional(),
  department: z.string().min(2, "Department must be at least 2 characters"),
  entity: z.enum(ENTITIES),
  startDate: z
    .string()
    .min(1, "Start date is required")
    .refine((d) => !isNaN(Date.parse(d)), "Start date must be a valid date")
    .refine((d) => new Date(d) >= new Date(new Date().toDateString()), "Start date cannot be in the past"),
  items: z
    .array(z.enum(ONBOARDING_ITEMS))
    .min(1, "Select at least one onboarding item"),
  attachments: z.array(z.string()).optional(),
  notes: z.string().max(500, "Notes cannot exceed 500 characters").optional(),
})

// ─── Offboarding Schema ───────────────────────────────────────────────────────

export const OffboardingPayloadSchema = z.object({
  hrType: z.literal("offboarding"),
  employeeName: z
    .string()
    .min(2, "Employee name must be at least 2 characters"),
  employeeId: z
    .string()
    .min(1, "Employee ID is required")
    .regex(employeeIdRegex, "Employee ID must only contain letters, numbers, hyphens, or underscores"),
  jobTitle: z.string().min(2, "Job title must be at least 2 characters").optional(),
  employmentType: z.enum(EMPLOYMENT_TYPES),
  directManager: z.string().min(2, "Manager name must be at least 2 characters").optional(),
  department: z.string().min(2, "Department must be at least 2 characters"),
  sector: z.string().min(1, "Sector is required"),
  lastWorkingDay: z
    .string()
    .min(1, "Last working day is required")
    .refine((d) => !isNaN(Date.parse(d)), "Last working day must be a valid date"),
  items: z
    .array(z.enum(OFFBOARDING_ITEMS))
    .min(1, "Select at least one offboarding item"),
  attachments: z.array(z.string()).optional(),
  notes: z.string().max(500, "Notes cannot exceed 500 characters").optional(),
})

// ─── Combined HR Payload ──────────────────────────────────────────────────────

export const HRPayloadSchema = z.discriminatedUnion("hrType", [
  OnboardingPayloadSchema,
  OffboardingPayloadSchema,
])

export type OnboardingPayload = z.infer<typeof OnboardingPayloadSchema>
export type OffboardingPayload = z.infer<typeof OffboardingPayloadSchema>
export type HRPayload = z.infer<typeof HRPayloadSchema>
