import { z } from "zod"

// ─── Purchase Categories & Platforms ──────────────────────────────────────────

export const PURCHASE_CATEGORIES = ["Electronics", "Office Supplies", "Furniture", "Software", "Services", "Other"] as const
export const PURCHASE_PLATFORMS = ["Amazon", "Noon", "Other"] as const

export type PurchaseCategory = (typeof PURCHASE_CATEGORIES)[number]
export type PurchasePlatform = (typeof PURCHASE_PLATFORMS)[number]

// ─── Purchase Request Schema ───────────────────────────────────────────────────

export const PurchasePayloadSchema = z.object({
  requestTitle: z.string().min(1, "Request title is required"),
  itemTitle: z.string().min(1, "Item title is required"),
  description: z.string().min(1, "Description is required"),
  category: z.enum(PURCHASE_CATEGORIES),
  platform: z.enum(PURCHASE_PLATFORMS),
  supplier: z.string().optional(),
  productUrl: z.union([z.literal(""), z.string().url("Please enter a valid URL")]).optional(),
  quantity: z.number().min(1, "Quantity must be at least 1"),
  estimatedPrice: z.number().min(0, "Price must be positive").max(3000, "Estimated price cannot exceed 3000 EGP"),
  department: z.string().min(1, "Department is required"),
  directManager: z.string().min(1, "Direct Manager is required"),
  businessJustification: z.string().min(1, "Business justification is required"),
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
}).refine(
  (data) => data.platform !== "Other" || data.supplier,
  {
    message: "Supplier is required when platform is 'Other'",
    path: ["supplier"],
  }
)

export type PurchasePayload = z.infer<typeof PurchasePayloadSchema>
