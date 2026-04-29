import { z } from "zod"

// ─── Onboarding Items ─────────────────────────────────────────────────────────

export const ONBOARDING_ITEMS = [
  "Medical Insurance for New Hire",
  "Access Card",
  "Seating Assignment",
] as const

export const OFFBOARDING_ITEMS = [
  "Close Medical for Leaver",
  "Collect Access Card",
] as const

export const HR_STATUSES = ["new", "on_hold", "completed"] as const

export type HRStatus = (typeof HR_STATUSES)[number]
export type HRType = "onboarding" | "offboarding"

// ─── Onboarding Schema ────────────────────────────────────────────────────────

export const OnboardingPayloadSchema = z.object({
  hrType: z.literal("onboarding"),
  employeeName: z.string().min(1, "Employee name is required"),
  employeeId: z.string().min(1, "Employee ID is required"),
  department: z.string().min(1, "Department is required"),
  startDate: z.string().min(1, "Start date is required"),
  items: z
    .array(z.enum(ONBOARDING_ITEMS))
    .min(1, "Select at least one onboarding item"),
  notes: z.string().max(500).optional(),
})

// ─── Offboarding Schema ───────────────────────────────────────────────────────

export const OffboardingPayloadSchema = z.object({
  hrType: z.literal("offboarding"),
  employeeName: z.string().min(1, "Employee name is required"),
  employeeId: z.string().min(1, "Employee ID is required"),
  department: z.string().min(1, "Department is required"),
  lastWorkingDay: z.string().min(1, "Last working day is required"),
  items: z
    .array(z.enum(OFFBOARDING_ITEMS))
    .min(1, "Select at least one offboarding item"),
  notes: z.string().max(500).optional(),
})

// ─── Combined HR Payload ──────────────────────────────────────────────────────

export const HRPayloadSchema = z.discriminatedUnion("hrType", [
  OnboardingPayloadSchema,
  OffboardingPayloadSchema,
])

export type OnboardingPayload = z.infer<typeof OnboardingPayloadSchema>
export type OffboardingPayload = z.infer<typeof OffboardingPayloadSchema>
export type HRPayload = z.infer<typeof HRPayloadSchema>
