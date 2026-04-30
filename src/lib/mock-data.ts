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
