export const REQUEST_MODULES = [
  "shipping",
  "maintenance",
  "purchase",
  "event",
  "travel",
  "hr",
] as const

export type RequestModule = (typeof REQUEST_MODULES)[number]

export const REQUEST_STATUSES = [
  "draft",
  "new",
  "on_hold",
  "in_customs",
  "in_transit",
  "delivered",
  "completed",
  "cancelled",
] as const

export type RequestStatus = (typeof REQUEST_STATUSES)[number]

export const MODULE_PREFIX: Record<RequestModule, string> = {
  shipping: "SHP",
  maintenance: "MNT",
  purchase: "PRC",
  event: "EVT",
  travel: "TRV",
  hr: "HR",
}

