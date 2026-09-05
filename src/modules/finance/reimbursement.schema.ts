import { z } from "zod"

export const EXPENSE_CATEGORIES = ["Travel", "Meals", "Office Supplies", "Client Entertainment", "Training", "Other"] as const
export const REIMBURSEMENT_CURRENCIES = ["USD", "EUR", "EGP"] as const

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number]
export type ReimbursementCurrency = (typeof REIMBURSEMENT_CURRENCIES)[number]

const AttachmentSchema = z.object({
  id: z.string(),
  name: z.string(),
  url: z.string(),
  mimeType: z.string(),
  sizeBytes: z.number(),
  uploadedAt: z.string(),
})

export const ReimbursementPayloadSchema = z.object({
  requestTitle: z.string().min(1, "Request title is required"),
  amount: z.number().min(0.01, "Amount must be greater than 0"),
  currency: z.enum(REIMBURSEMENT_CURRENCIES),
  category: z.enum(EXPENSE_CATEGORIES),
  dateOfExpense: z.string().min(1, "Date of expense is required"),
  description: z.string().min(1, "Description / justification is required"),
  directManager: z.string().min(1, "Direct Manager is required"),
  receipt: AttachmentSchema.optional(),
  additionalAttachments: z.array(AttachmentSchema).optional(),
  notes: z.string().max(500).optional(),
  ccEmails: z.array(z.string().email()).default([]),
})

export type ReimbursementPayload = z.infer<typeof ReimbursementPayloadSchema>
