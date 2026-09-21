import { z } from "zod"
import { FINANCE_PRIORITIES } from "./financeSla"

// Full active ISO 4217 currency code list.
export const INVOICE_PAYMENT_CURRENCIES = [
  "AED", "AFN", "ALL", "AMD", "ANG", "AOA", "ARS", "AUD", "AWG", "AZN",
  "BAM", "BBD", "BDT", "BGN", "BHD", "BIF", "BMD", "BND", "BOB", "BRL",
  "BSD", "BTN", "BWP", "BYN", "BZD", "CAD", "CDF", "CHF", "CLP", "CNY",
  "COP", "CRC", "CUP", "CVE", "CZK", "DJF", "DKK", "DOP", "DZD", "EGP",
  "ERN", "ETB", "EUR", "FJD", "FKP", "GBP", "GEL", "GHS", "GIP", "GMD",
  "GNF", "GTQ", "GYD", "HKD", "HNL", "HTG", "HUF", "IDR", "ILS", "INR",
  "IQD", "IRR", "ISK", "JMD", "JOD", "JPY", "KES", "KGS", "KHR", "KMF",
  "KPW", "KRW", "KWD", "KYD", "KZT", "LAK", "LBP", "LKR", "LRD", "LSL",
  "LYD", "MAD", "MDL", "MGA", "MKD", "MMK", "MNT", "MOP", "MRU", "MUR",
  "MVR", "MWK", "MXN", "MYR", "MZN", "NAD", "NGN", "NIO", "NOK", "NPR",
  "NZD", "OMR", "PAB", "PEN", "PGK", "PHP", "PKR", "PLN", "PYG", "QAR",
  "RON", "RSD", "RUB", "RWF", "SAR", "SBD", "SCR", "SDG", "SEK", "SGD",
  "SHP", "SLE", "SOS", "SRD", "SSP", "STN", "SYP", "SZL", "THB", "TJS",
  "TMT", "TND", "TOP", "TRY", "TTD", "TWD", "TZS", "UAH", "UGX", "USD",
  "UYU", "UZS", "VES", "VND", "VUV", "WST", "XAF", "XCD", "XOF", "XPF",
  "YER", "ZAR", "ZMW", "ZWL",
] as const

export const PAYMENT_METHODS = ["Wire Transfer", "Company Credit Card", "Cash", "Check"] as const
export const PO_OR_CONTRACT_OPTIONS = ["po", "contract", "other"] as const

export type InvoicePaymentCurrency = (typeof INVOICE_PAYMENT_CURRENCIES)[number]
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]
export type PoOrContract = (typeof PO_OR_CONTRACT_OPTIONS)[number]

const AttachmentSchema = z.object({
  id: z.string(),
  name: z.string(),
  url: z.string(),
  mimeType: z.string(),
  sizeBytes: z.number(),
  uploadedAt: z.string(),
})

// poNumbers is validated conditionally in the form's onSubmit handler
// based on poOrContract (not via zod superRefine) — see the note in
// reimbursement.schema.ts for why.
export const InvoicePaymentPayloadSchema = z.object({
  requestTitle: z.string().min(1, "Request title is required"),
  priority: z.enum(FINANCE_PRIORITIES),
  supplier: z.string().min(1, "Supplier is required"),
  poOrContract: z.enum(PO_OR_CONTRACT_OPTIONS),
  poNumbers: z.array(z.string().min(1)).optional(),
  otherDetails: z.string().optional(),
  amount: z.number().min(0.01, "Amount must be greater than 0"),
  currency: z.enum(INVOICE_PAYMENT_CURRENCIES),
  paymentTerms: z.string().min(1, "Payment terms are required"),
  paymentMethod: z.enum(PAYMENT_METHODS),
  // Finance-Team-only: optionally route this request through an approver
  // before it can move to In Progress. Any portal user or free-typed email
  // — not limited to the Company Data manager lists other modules use.
  approverEmail: z.string().email().optional().or(z.literal("")),
  approverName: z.string().optional(),
  invoiceFile: AttachmentSchema.optional(),
  additionalAttachments: z.array(AttachmentSchema).optional(),
  ccEmails: z.array(z.string().email()).default([]),
})

export type InvoicePaymentPayload = z.infer<typeof InvoicePaymentPayloadSchema>
