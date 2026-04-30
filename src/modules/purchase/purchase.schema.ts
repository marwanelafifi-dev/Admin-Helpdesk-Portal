import { z } from "zod"

// ─── Purchase Categories & Platforms ──────────────────────────────────────────

export const PURCHASE_CATEGORIES = ["Electronics", "Office Supplies", "Furniture", "Software", "Services", "Other"] as const
export const PURCHASE_PLATFORMS = ["Amazon", "Noon", "Other"] as const

export type PurchaseCategory = (typeof PURCHASE_CATEGORIES)[number]
export type PurchasePlatform = (typeof PURCHASE_PLATFORMS)[number]

// ─── Purchase Request Schema ───────────────────────────────────────────────────

export const PurchasePayloadSchema = z.object({
  itemTitle: z
    .string()
    .min(3, "Item title must be at least 3 characters")
    .max(150, "Item title cannot exceed 150 characters"),
  description: z
    .string()
    .min(10, "Please provide more detail about the item (min 10 characters)")
    .max(1000, "Description cannot exceed 1000 characters"),
  category: z.enum(PURCHASE_CATEGORIES, { error: "Please select a category" }),
  platform: z.enum(PURCHASE_PLATFORMS, { error: "Please select a platform" }),
  supplier: z.string().max(100, "Supplier name cannot exceed 100 characters").optional(),
  productUrl: z
    .string()
    .optional()
    .refine((v) => !v || v === "" || /^https?:\/\/.+/.test(v), "Please enter a valid URL (must start with http:// or https://)"),
  quantity: z
    .number()
    .int("Quantity must be a whole number")
    .min(1, "Quantity must be at least 1")
    .max(10000, "Quantity cannot exceed 10,000"),
  estimatedPrice: z
    .number()
    .min(0, "Price cannot be negative")
    .max(10_000_000, "Price cannot exceed 10,000,000"),
  department: z.string().min(2, "Department must be at least 2 characters"),
  businessJustification: z
    .string()
    .min(10, "Business justification must be more detailed (min 10 characters)")
    .max(1000, "Business justification cannot exceed 1000 characters"),
  attachments: z.array(z.string()).optional(),
  notes: z.string().max(500, "Notes cannot exceed 500 characters").optional(),
}).refine(
  (data) => data.platform !== "Other" || (data.supplier && data.supplier.trim().length >= 2),
  {
    message: "Supplier name is required when platform is 'Other'",
    path: ["supplier"],
  }
)

export type PurchasePayload = z.infer<typeof PurchasePayloadSchema>
