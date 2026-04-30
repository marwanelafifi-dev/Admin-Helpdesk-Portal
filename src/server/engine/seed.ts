import type { EngineRequest } from "@/lib/requests-api"

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
}

export function getSeedRequests(): EngineRequest[] {
  return [
    {
      id: "SHP-2026-0001",
      module: "shipping",
      title: "DHL shipment to Dubai warehouse",
      status: "on_hold",
      requesterId: "USR-001",
      requesterName: "Marwan Elafifi",
      requesterEmail: "marwan.elafifi@si-ware.com",
      payload: {
        carrier: "DHL",
        trackingNumber: "DHL123456",
        expectedDeliveryDate: "2026-05-15",
      },
      statusHistory: [
        { status: "new", changedBy: "USR-001", changedAt: daysAgo(5), comment: "Submitted" },
        { status: "on_hold", changedBy: "USR-001", changedAt: daysAgo(3), comment: "Picked up" },
      ],
      createdAt: daysAgo(5),
      updatedAt: daysAgo(3),
    },
    {
      id: "HR-2026-0001",
      module: "hr",
      title: "Onboarding – John Doe",
      status: "new",
      requesterId: "USR-002",
      requesterName: "Sara Ali",
      requesterEmail: "sara.ali@si-ware.com",
      payload: {
        hrType: "onboarding",
        employeeName: "John Doe",
        employeeId: "EMP-2026-001",
        department: "Engineering",
        startDate: "2026-05-10",
        items: ["Access Card"],
      },
      statusHistory: [{ status: "new", changedBy: "USR-002", changedAt: daysAgo(2), comment: "Submitted" }],
      createdAt: daysAgo(2),
      updatedAt: daysAgo(2),
    },
    {
      id: "MNT-2026-0001",
      module: "maintenance",
      title: "Server room AC maintenance",
      status: "new",
      requesterId: "USR-003",
      requesterName: "Ahmed Hassan",
      requesterEmail: "ahmed.hassan@si-ware.com",
      payload: { priority: "High", description: "AC not cooling properly" },
      statusHistory: [{ status: "new", changedBy: "USR-003", changedAt: daysAgo(1), comment: "Submitted" }],
      createdAt: daysAgo(1),
      updatedAt: daysAgo(1),
    },
    {
      id: "PRC-2026-0001",
      module: "purchase",
      title: "New laptop for dev team",
      status: "in_customs",
      requesterId: "USR-004",
      requesterName: "Nour Ibrahim",
      requesterEmail: "nour.ibrahim@si-ware.com",
      payload: { itemTitle: "Dell XPS 15", quantity: 1, estimatedPrice: 5000 },
      statusHistory: [
        { status: "new", changedBy: "USR-004", changedAt: daysAgo(6), comment: "Submitted" },
        { status: "in_customs", changedBy: "USR-001", changedAt: daysAgo(4), comment: "Awaiting approval" },
      ],
      createdAt: daysAgo(6),
      updatedAt: daysAgo(4),
    },
    {
      id: "EVT-2026-0001",
      module: "event",
      title: "Team building event venue",
      status: "new",
      requesterId: "USR-005",
      requesterName: "Khalid Mahmoud",
      requesterEmail: "khalid.mahmoud@si-ware.com",
      payload: { eventName: "Team Building", eventDate: "2026-05-20", expectedAttendees: 30 },
      statusHistory: [{ status: "new", changedBy: "USR-005", changedAt: daysAgo(7), comment: "Submitted" }],
      createdAt: daysAgo(7),
      updatedAt: daysAgo(7),
    },
    {
      id: "TRV-2026-0001",
      module: "travel",
      title: "Business travel to Dubai",
      status: "in_transit",
      requesterId: "USR-006",
      requesterName: "Dina Youssef",
      requesterEmail: "dina.youssef@si-ware.com",
      payload: { destination: "Dubai, AE", departureDate: "2026-05-03", returnDate: "2026-05-06" },
      statusHistory: [
        { status: "new", changedBy: "USR-006", changedAt: daysAgo(10), comment: "Submitted" },
        { status: "in_transit", changedBy: "USR-006", changedAt: daysAgo(8), comment: "Trip started" },
      ],
      createdAt: daysAgo(10),
      updatedAt: daysAgo(8),
    },
  ]
}
