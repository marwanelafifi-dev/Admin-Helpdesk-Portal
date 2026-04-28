import type { ShippingRequest, ShippingRequestForm } from "./shipping.schema"

const APPROVERS = {
  sara: { userId: "USR-002", name: "Sara Ali", email: "sara.ali@si-ware.com" },
  ahmed: { userId: "USR-003", name: "Ahmed Hassan", email: "ahmed.hassan@si-ware.com" },
  marwan: { userId: "USR-001", name: "Marwan Elafifi", email: "marwan.elafifi@si-ware.com" },
}

export const mockShippingRequests: ShippingRequest[] = [
  {
    id: "SHP-2026-0001",
    module: "shipping",
    title: "Client samples to Dubai distributor",
    status: "approved",
    requesterId: "USR-007",
    requesterName: "Omar Farouk",
    requesterEmail: "omar.farouk@si-ware.com",
    notes: "Fragile items.",
    approvers: [{ ...APPROVERS.sara, order: 1 }],
    attachments: [],
    statusHistory: [
      { status: "draft", changedBy: "USR-007", changedAt: "2026-04-17T08:00:00.000Z" },
      { status: "approved", changedBy: "USR-002", changedAt: "2026-04-20T10:30:00.000Z" },
    ],
    createdAt: "2026-04-17T08:00:00.000Z",
    updatedAt: "2026-04-20T10:30:00.000Z",
    payload: {
      supplier: "Cloud IT",
      costCenter: "IT",
      poNumber: "PO-2026-0412",
      approvers: {
        directManager: APPROVERS.sara,
        techManager: [APPROVERS.ahmed],
        pm: [APPROVERS.marwan],
      },
      ccEmails: ["finance@si-ware.com"],
      carrier: "DHL",
      trackingNumber: "1Z999AA10123456784",
      trackingLink: "https://dhl.example/1Z999AA10123456784",
      description: "Optical sensor samples.",
      expectedPickupDate: "2026-04-21",
      expectedDeliveryDate: "2026-04-24",
    },
  },
]

export const shippingFormDefaults = {
  title: "",
  notes: "",
  approvers: {
    directManager: "",
    techManager: [],
    pm: [],
  },
  ccEmails: [],
  supplier: "" as ShippingRequestForm["supplier"],
  costCenter: "" as ShippingRequestForm["costCenter"],
  poNumber: "",
  carrier: "" as ShippingRequestForm["carrier"],
  carrierName: "",
  trackingNumber: "",
  trackingLink: "",
  description: "",
  expectedPickupDate: "",
  expectedDeliveryDate: "",
  attachments: [],
} satisfies ShippingRequestForm
