export interface MockRequest {
  id: string
  title: string
  module: string
  status: "Pending" | "Approved" | "Rejected" | "In Progress"
  requester: string
  date: string
  priority: "Low" | "Medium" | "High"
}

export interface MockShipment {
  id: string
  trackingNumber: string
  carrier: string
  origin: string
  destination: string
  status: "Pending" | "In Transit" | "Delivered" | "Cancelled"
  expectedDelivery: string
  requester: string
}

export interface MockUser {
  id: string
  name: string
  email: string
  role: string
  status: "Active" | "Inactive"
  joinedDate: string
}

export interface MockRole {
  id: string
  name: string
  description: string
  permissions: string[]
  userCount: number
}

export interface ActivityItem {
  id: string
  title: string
  time: string
  status: string
  module: string
}

export const mockStats = {
  totalRequests: 142,
  pendingRequests: 28,
  approvedRequests: 89,
  rejectedRequests: 25,
  inProgress: 45,
  totalShipments: 67,
  inTransit: 18,
  delivered: 41,
}

export const mockRequestsByModule = [
  { module: "Shipping", count: 35 },
  { module: "Maintenance", count: 22 },
  { module: "Purchase", count: 31 },
  { module: "Event", count: 15 },
  { module: "Travel", count: 18 },
  { module: "Other", count: 21 },
]

export const mockRecentActivity: ActivityItem[] = [
  { id: "1", title: "Shipment REQ-2041 approved", time: "2 minutes ago", status: "Approved", module: "Shipping" },
  { id: "2", title: "Purchase request PRQ-088 submitted", time: "15 minutes ago", status: "Pending", module: "Purchase" },
  { id: "3", title: "Maintenance ticket MNT-023 in progress", time: "1 hour ago", status: "In Progress", module: "Maintenance" },
  { id: "4", title: "Travel request TRV-016 rejected", time: "2 hours ago", status: "Rejected", module: "Travel" },
  { id: "5", title: "Event request EVT-009 approved", time: "3 hours ago", status: "Approved", module: "Event" },
  { id: "6", title: "Shipment REQ-2040 delivered", time: "5 hours ago", status: "Approved", module: "Shipping" },
]

export const mockRequests: MockRequest[] = [
  { id: "REQ-2041", title: "Office supplies procurement", module: "Purchase", status: "Pending", requester: "Ahmed Hassan", date: "2026-04-27", priority: "Medium" },
  { id: "REQ-2040", title: "Server room AC maintenance", module: "Maintenance", status: "In Progress", requester: "Sara Ali", date: "2026-04-26", priority: "High" },
  { id: "REQ-2039", title: "Shipment to Cairo warehouse", module: "Shipping", status: "Approved", requester: "Marwan Elafifi", date: "2026-04-25", priority: "High" },
  { id: "REQ-2038", title: "Team building event venue", module: "Event", status: "Approved", requester: "Nour Ibrahim", date: "2026-04-24", priority: "Low" },
  { id: "REQ-2037", title: "Business travel to Dubai", module: "Travel", status: "Rejected", requester: "Khalid Mahmoud", date: "2026-04-23", priority: "Medium" },
  { id: "REQ-2036", title: "New laptop for dev team", module: "Purchase", status: "Approved", requester: "Dina Youssef", date: "2026-04-22", priority: "High" },
  { id: "REQ-2035", title: "DHL pickup – client samples", module: "Shipping", status: "In Progress", requester: "Omar Farouk", date: "2026-04-22", priority: "Medium" },
  { id: "REQ-2034", title: "HVAC filter replacement", module: "Maintenance", status: "Pending", requester: "Layla Nasser", date: "2026-04-21", priority: "Low" },
  { id: "REQ-2033", title: "Annual conference registration", module: "Event", status: "Pending", requester: "Tarek Saleh", date: "2026-04-20", priority: "Medium" },
  { id: "REQ-2032", title: "Flight booking – Riyadh", module: "Travel", status: "Approved", requester: "Hana Gamal", date: "2026-04-19", priority: "High" },
]

export const mockShipments: MockShipment[] = [
  { id: "SHP-0067", trackingNumber: "1Z999AA10123456784", carrier: "DHL", origin: "Cairo, EG", destination: "Dubai, AE", status: "In Transit", expectedDelivery: "2026-04-30", requester: "Marwan Elafifi" },
  { id: "SHP-0066", trackingNumber: "9400111899223388456", carrier: "FedEx", origin: "Alexandria, EG", destination: "London, UK", status: "Delivered", expectedDelivery: "2026-04-22", requester: "Sara Ali" },
  { id: "SHP-0065", trackingNumber: "JD014600006741234567", carrier: "Aramex", origin: "Cairo, EG", destination: "Riyadh, SA", status: "Pending", expectedDelivery: "2026-05-03", requester: "Ahmed Hassan" },
  { id: "SHP-0064", trackingNumber: "1Z999AA10123456785", carrier: "UPS", origin: "Giza, EG", destination: "Frankfurt, DE", status: "In Transit", expectedDelivery: "2026-04-29", requester: "Omar Farouk" },
  { id: "SHP-0063", trackingNumber: "4206300192748927005377", carrier: "USPS", origin: "Cairo, EG", destination: "New York, US", status: "Delivered", expectedDelivery: "2026-04-18", requester: "Nour Ibrahim" },
  { id: "SHP-0062", trackingNumber: "JD014600006741234568", carrier: "TNT", origin: "Cairo, EG", destination: "Paris, FR", status: "Cancelled", expectedDelivery: "2026-04-15", requester: "Khalid Mahmoud" },
  { id: "SHP-0061", trackingNumber: "1Z999AA10123456786", carrier: "Maersk", origin: "Port Said, EG", destination: "Rotterdam, NL", status: "In Transit", expectedDelivery: "2026-05-10", requester: "Dina Youssef" },
]

export const mockUsers: MockUser[] = [
  { id: "USR-001", name: "Marwan Elafifi", email: "marwan.elafifi@si-ware.com", role: "Super Admin", status: "Active", joinedDate: "2024-01-15" },
  { id: "USR-002", name: "Sara Ali", email: "sara.ali@si-ware.com", role: "Admin", status: "Active", joinedDate: "2024-02-10" },
  { id: "USR-003", name: "Ahmed Hassan", email: "ahmed.hassan@si-ware.com", role: "Manager", status: "Active", joinedDate: "2024-03-05" },
  { id: "USR-004", name: "Nour Ibrahim", email: "nour.ibrahim@si-ware.com", role: "Viewer", status: "Active", joinedDate: "2024-04-01" },
  { id: "USR-005", name: "Khalid Mahmoud", email: "khalid.mahmoud@si-ware.com", role: "Manager", status: "Inactive", joinedDate: "2024-02-20" },
  { id: "USR-006", name: "Dina Youssef", email: "dina.youssef@si-ware.com", role: "Viewer", status: "Active", joinedDate: "2024-05-12" },
  { id: "USR-007", name: "Omar Farouk", email: "omar.farouk@si-ware.com", role: "Manager", status: "Active", joinedDate: "2024-06-08" },
]

export const mockRoles: MockRole[] = [
  {
    id: "ROLE-001",
    name: "Super Admin",
    description: "Full access to all modules and settings",
    permissions: ["create", "read", "update", "delete", "manage_users", "manage_roles", "settings"],
    userCount: 1,
  },
  {
    id: "ROLE-002",
    name: "Admin",
    description: "Full access to requests and shipping modules",
    permissions: ["create", "read", "update", "delete", "manage_users"],
    userCount: 2,
  },
  {
    id: "ROLE-003",
    name: "Manager",
    description: "Can create, approve, and reject requests",
    permissions: ["create", "read", "update", "approve", "reject"],
    userCount: 3,
  },
  {
    id: "ROLE-004",
    name: "Requester",
    description: "Can create and view own requests",
    permissions: ["create", "read_own"],
    userCount: 8,
  },
  {
    id: "ROLE-005",
    name: "Viewer",
    description: "Read-only access to all modules",
    permissions: ["read"],
    userCount: 5,
  },
]
