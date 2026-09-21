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

export const ReimbursementExpenseRowSchema = z.object({
  po: z.string().trim().optional(),
  description: z.string().trim().min(1, "Description is required"),
  costCenter: z.string().trim().min(1, "Cost center is required"),
  currency: z.enum(REIMBURSEMENT_CURRENCIES),
  amount: z.number().positive("Amount must be greater than 0"),
})

// poNumbers / directManager / company-expense payment evidence (stored under
// the legacy creditCardStatement key) are validated
// conditionally in the form's onSubmit handler (not via zod superRefine) —
// a discriminated-toggle field failing zod validation before onSubmit runs
// has previously blocked submission entirely for other conditional forms
// in this app (see the Travel form fix in CLAUDE.md Phase 6r), so all of
// them stay optional here.
export const ReimbursementPayloadSchema = z.object({
  requestTitle: z.string().min(1, "Request title is required"),
  priority: z.enum(FINANCE_PRIORITIES),
  expenseRows: z.array(ReimbursementExpenseRowSchema).min(1, "Add at least one expense row"),
  // Legacy summary fields are retained for existing requests, list views,
  // exports, and notifications. New submissions derive them from expenseRows.
  poOption: z.enum(PO_OPTIONS),
  poNumbers: z.array(z.string().min(1)).optional(),
  directManager: z.string().optional(),
  costCenter: z.string().optional(),
  amount: z.number().optional(),
  currency: z.enum(REIMBURSEMENT_CURRENCIES).optional(),
  paidByPersonalCreditCard: z.boolean(),
  creditCardStatement: AttachmentSchema.optional(),
  reimbursementForm: AttachmentSchema.optional(),
  supportingDocument: AttachmentSchema.optional(),
  additionalAttachments: z.array(AttachmentSchema).optional(),
  ccEmails: z.array(z.string().email()),
}).superRefine((data, ctx) => {
  if (data.poOption === "has_po") {
    data.expenseRows.forEach((row, index) => {
      if (!row.po?.trim()) {
        ctx.addIssue({ code: "custom", message: "PO is required", path: ["expenseRows", index, "po"] })
      }
    })
  }
})

export type ReimbursementPayload = z.infer<typeof ReimbursementPayloadSchema>
