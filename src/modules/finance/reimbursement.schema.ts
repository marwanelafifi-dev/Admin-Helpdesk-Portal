import { z } from "zod"
import { FINANCE_PRIORITIES } from "./financeSla"

export const REIMBURSEMENT_CURRENCIES = ["USD", "EUR", "EGP"] as const
export const PO_OPTIONS = ["has_po", "no_po"] as const

export type ReimbursementCurrency = (typeof REIMBURSEMENT_CURRENCIES)[number]
export type PoOption = (typeof PO_OPTIONS)[number]

const AttachmentSchema = z.object({
  id: z.string(),
  name: z.string(),
  url: z.string(),
  mimeType: z.string(),
  sizeBytes: z.number(),
  uploadedAt: z.string(),
})

// poNumbers / directManager / creditCardAccountNumber / creditCardStatement
// are validated conditionally in the form's onSubmit handler (not via zod
// superRefine) — a discriminated-toggle field failing zod validation before
// onSubmit runs has previously blocked submission entirely for other
// conditional forms in this app (see the Travel form fix in CLAUDE.md Phase
// 6r), so all of them stay optional here.
export const ReimbursementPayloadSchema = z.object({
  requestTitle: z.string().min(1, "Request title is required"),
  priority: z.enum(FINANCE_PRIORITIES),
  poOption: z.enum(PO_OPTIONS),
  poNumbers: z.array(z.string().min(1)).optional(),
  directManager: z.string().optional(),
  costCenter: z.string().min(1, "Cost center is required"),
  amount: z.number().min(0.01, "Amount must be greater than 0"),
  currency: z.enum(REIMBURSEMENT_CURRENCIES),
  paidByPersonalCreditCard: z.boolean().default(false),
  creditCardAccountNumber: z.string().optional(),
  creditCardStatement: AttachmentSchema.optional(),
  supportingDocument: AttachmentSchema.optional(),
  additionalAttachments: z.array(AttachmentSchema).optional(),
  ccEmails: z.array(z.string().email()).default([]),
})

export type ReimbursementPayload = z.infer<typeof ReimbursementPayloadSchema>
