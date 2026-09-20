import { z } from "zod"
import { FINANCE_PRIORITIES } from "./financeSla"

export const TRAVEL_REIMBURSEMENT_CURRENCIES = ["USD", "EUR", "EGP"] as const

export type TravelReimbursementCurrency = (typeof TRAVEL_REIMBURSEMENT_CURRENCIES)[number]

const AttachmentSchema = z.object({
  id: z.string(),
  name: z.string(),
  url: z.string(),
  mimeType: z.string(),
  sizeBytes: z.number(),
  uploadedAt: z.string(),
})

// Company-expense payment evidence is stored under the legacy
// creditCardStatement key and validated conditionally in the form's onSubmit
// handler (not via zod superRefine) — see the note in
// reimbursement.schema.ts for why.
export const TravelReimbursementPayloadSchema = z.object({
  requestTitle: z.string().min(1, "Request title is required"),
  priority: z.enum(FINANCE_PRIORITIES),
  costCenter: z.string().min(1, "Cost center is required"),
  amount: z.number().min(0.01, "Amount must be greater than 0"),
  currency: z.enum(TRAVEL_REIMBURSEMENT_CURRENCIES),
  authorizedManager: z.string().min(1, "Authorized Manager is required"),
  paidByPersonalCreditCard: z.boolean().default(false),
  creditCardStatement: AttachmentSchema.optional(),
  reimbursementForm: AttachmentSchema.optional(),
  supportingDocument: AttachmentSchema.optional(),
  additionalAttachments: z.array(AttachmentSchema).optional(),
  ccEmails: z.array(z.string().email()).default([]),
})

export type TravelReimbursementPayload = z.infer<typeof TravelReimbursementPayloadSchema>
