import { z } from "zod"
import { NETSUITE_SUPPLIERS, NETSUITE_COST_CENTERS } from "@/data/netsuite.mock"

export const SUPPLIERS = NETSUITE_SUPPLIERS as [string, ...string[]]
export const COST_CENTERS = NETSUITE_COST_CENTERS as [string, ...string[]]

export const CARRIERS = ["DHL", "FedEx", "UPS", "Aramex", "Other"] as const

export const REQUEST_STATUSES = [
  "draft",
  "New",
  "In Progress",
  "In Customs",
  "Delivered",
  "Cancelled",
] as const

export const AttachmentSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "File name is required"),
  url: z.url({ error: "Must be a valid storage URL" }),
  mimeType: z.string(),
  sizeBytes: z.number().positive(),
  uploadedAt: z.iso.datetime(),
})

export const ApproverSchema = z.object({
  userId: z.string().min(1, "Approver ID is required"),
  name: z.string().min(1),
  email: z.email({ error: "Invalid approver email" }),
  order: z.number().int().min(1, "Approval order must start at 1"),
  approvedAt: z.iso.datetime().optional(),
  rejectedAt: z.iso.datetime().optional(),
  comment: z.string().optional(),
})

export const StatusChangeSchema = z.object({
  status: z.enum(REQUEST_STATUSES),
  changedBy: z.string().min(1),
  changedAt: z.iso.datetime(),
  comment: z.string().optional(),
})

export const BaseRequestSchema = z.object({
  id: z.string(),
  module: z.string(),
  title: z.string().min(3, "Title must be at least 3 characters"),
  status: z.enum(REQUEST_STATUSES).default("draft"),
  requesterId: z.string().min(1, "Requester ID is required"),
  requesterName: z.string().min(1),
  requesterEmail: z.email({ error: "Invalid requester email" }),
  approvers: z.array(ApproverSchema).min(1, "At least one approver is required"),
  attachments: z.array(AttachmentSchema).default([]),
  notes: z.string().max(1000).optional(),
  statusHistory: z.array(StatusChangeSchema).default([]),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
})

const ApproverPersonSchema = z.object({
  userId: z.string().min(1),
  name: z.string().min(1),
  email: z.email(),
})

export const ShippingApproversSchema = z.object({
  directManager: ApproverPersonSchema,
  techManager: z.array(ApproverPersonSchema).default([]),
  pm: z.array(ApproverPersonSchema).default([]),
})

export const ShippingApproversFormSchema = z.object({
  directManager: z.string().min(1, "Direct Manager is required"),
  techManager: z.array(z.string()).default([]),
  pm: z.array(z.string()).default([]),
})

export const ShippingPayloadSchema = z
  .object({
    supplier: z.enum(SUPPLIERS, { error: "Select a valid supplier" }),
    costCenter: z.enum(COST_CENTERS, { error: "Select a valid cost center" }),
    poNumber: z
      .string()
      .min(3, "PO number must be at least 3 characters")
      .max(50, "PO number cannot exceed 50 characters")
      .regex(/^[A-Za-z0-9\-_/]+$/, "PO number must only contain letters, numbers, hyphens, underscores, or slashes"),

    approvers: ShippingApproversSchema,
    ccEmails: z.array(z.email({ error: "Invalid email address" })).default([]),

    carrier: z.enum(CARRIERS),
    carrierName: z.string().max(100, "Carrier name cannot exceed 100 characters").optional(),
    trackingNumber: z
      .string()
      .min(3, "Tracking number must be at least 3 characters")
      .max(50, "Tracking number cannot exceed 50 characters"),
    trackingLink: z.string().optional(),
    description: z.string().max(500).optional(),

    expectedPickupDate: z.iso.date().optional(),
    expectedDeliveryDate: z.iso.date({ error: "Delivery Date is required" }),
  })
  .superRefine((val, ctx) => {
    if (val.carrier === "Other" && !val.carrierName?.trim()) {
      ctx.addIssue({
        code: "custom",
        message: "Carrier Name is required when Carrier is Other",
        path: ["carrierName"],
      })
    }
  })

export const ShippingRequestSchema = BaseRequestSchema.extend({
  module: z.literal("shipping"),
  payload: ShippingPayloadSchema,
})

export const ShippingRequestFormSchema = z
  .object({
    title: z.string().min(3, "Title must be at least 3 characters"),
    notes: z.string().max(1000).optional(),

    approvers: ShippingApproversFormSchema,
    ccEmails: z.array(z.email({ error: "Must be a valid email address" })).default([]),

    supplier: z.enum(SUPPLIERS, { error: "Select a valid supplier" }),
    costCenter: z.enum(COST_CENTERS, { error: "Select a valid cost center" }),
    poNumber: z
      .string()
      .min(3, "PO number must be at least 3 characters")
      .max(50, "PO number cannot exceed 50 characters")
      .regex(/^[A-Za-z0-9\-_/]+$/, "PO number must only contain letters, numbers, hyphens, underscores, or slashes"),

    carrier: z.enum(CARRIERS),
    carrierName: z.string().max(100, "Carrier name cannot exceed 100 characters").optional(),
    trackingNumber: z
      .string()
      .min(3, "Tracking number must be at least 3 characters")
      .max(50, "Tracking number cannot exceed 50 characters"),
    trackingLink: z.string().optional(),
    description: z.string().max(500).optional(),

    expectedPickupDate: z.string().optional(),
    expectedDeliveryDate: z.string().min(1, "Delivery Date is required"),

    attachments: z
      .array(
        z.object({
          name: z.string(),
          url: z.url(),
          mimeType: z.string(),
          sizeBytes: z.number().positive(),
          uploadedAt: z.iso.datetime(),
        })
      )
      .optional(),
  })
  .superRefine((val, ctx) => {
    if (val.carrier === "Other" && !val.carrierName?.trim()) {
      ctx.addIssue({
        code: "custom",
        message: "Carrier Name is required when Carrier is Other",
        path: ["carrierName"],
      })
    }

    if (
      val.expectedPickupDate &&
      val.expectedDeliveryDate &&
      val.expectedDeliveryDate < val.expectedPickupDate
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Delivery date cannot be before pickup date",
        path: ["expectedDeliveryDate"],
      })
    }
  })

export type Attachment = z.infer<typeof AttachmentSchema>
export type Approver = z.infer<typeof ApproverSchema>
export type ShippingApprovers = z.infer<typeof ShippingApproversSchema>
export type ShippingApproversForm = z.infer<typeof ShippingApproversFormSchema>
export type StatusChange = z.infer<typeof StatusChangeSchema>
export type BaseRequest = z.infer<typeof BaseRequestSchema>
export type ShippingPayload = z.infer<typeof ShippingPayloadSchema>
export type ShippingRequest = z.infer<typeof ShippingRequestSchema>
export type ShippingRequestForm = z.infer<typeof ShippingRequestFormSchema>
export type RequestStatus = (typeof REQUEST_STATUSES)[number]
export type Supplier = (typeof SUPPLIERS)[number]
export type CostCenter = (typeof COST_CENTERS)[number]
export type Carrier = (typeof CARRIERS)[number]
