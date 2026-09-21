import { z } from "zod"
import { FINANCE_PRIORITIES } from "./financeSla"

export const TRAVEL_REIMBURSEMENT_CURRENCIES = ["USD", "EUR", "EGP"] as const
export const TRAVEL_EXPENSE_DESCRIPTIONS = ["Uber", "Air Ticket", "Hotel", "Roaming", "Train", "Breakfast", "Others"] as const

export type TravelReimbursementCurrency = (typeof TRAVEL_REIMBURSEMENT_CURRENCIES)[number]
export type TravelExpenseDescription = (typeof TRAVEL_EXPENSE_DESCRIPTIONS)[number]

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
export const TravelExpenseRowSchema = z.object({
  description: z.string().trim().min(1, "Description is required"),
  otherDescription: z.string().trim().optional(),
  usdAmount: z.number().min(0, "Amount cannot be negative"),
  eurAmount: z.number().min(0, "Amount cannot be negative"),
  egpAmount: z.number().min(0, "Amount cannot be negative"),
})

export const TravelReimbursementPayloadSchema = z.object({
  requestTitle: z.string().min(1, "Request title is required"),
  priority: z.enum(FINANCE_PRIORITIES),
  costCenter: z.string().min(1, "Cost center is required"),
  expenseRows: z.array(TravelExpenseRowSchema).min(1, "Add at least one expense row"),
  // Legacy summary fields remain optional for existing list and email views.
  amount: z.number().optional(),
  currency: z.enum(TRAVEL_REIMBURSEMENT_CURRENCIES).optional(),
  authorizedManager: z.string().min(1, "Authorized Manager is required"),
  paidByPersonalCreditCard: z.boolean(),
  creditCardStatement: AttachmentSchema.optional(),
  reimbursementForm: AttachmentSchema.optional(),
  supportingDocument: AttachmentSchema.optional(),
  additionalAttachments: z.array(AttachmentSchema).optional(),
  ccEmails: z.array(z.string().email()),
}).superRefine((data, ctx) => {
  data.expenseRows.forEach((row, index) => {
    if (row.description === "Others" && !row.otherDescription?.trim()) {
      ctx.addIssue({ code: "custom", message: "Enter the expense description", path: ["expenseRows", index, "otherDescription"] })
    }
    if (row.usdAmount <= 0 && row.eurAmount <= 0 && row.egpAmount <= 0) {
      ctx.addIssue({ code: "custom", message: "Enter an amount in at least one currency", path: ["expenseRows", index, "usdAmount"] })
    }
  })
})

export type TravelReimbursementPayload = z.infer<typeof TravelReimbursementPayloadSchema>
