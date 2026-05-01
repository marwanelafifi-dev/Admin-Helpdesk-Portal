import { mockUsers } from "@/lib/mock-data"

export interface StoredNotification {
  id: string
  userId: string
  type: string
  title: string
  description: string
  requestId?: string
  actionUrl?: string
  createdAt: string
  read: boolean
}

const STORAGE_KEY = "arp_notifications"
const subscribers = new Set<(notifications: StoredNotification[]) => void>()

function readAllNotifications(): StoredNotification[] {
  if (typeof window === "undefined") {
    return []
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as StoredNotification[]) : []
  } catch (error) {
    console.warn("Failed to read notifications from localStorage", error)
    return []
  }
}

function writeAllNotifications(notifications: StoredNotification[]) {
  if (typeof window === "undefined") {
    return
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications))
  subscribers.forEach((callback) => callback(notifications))
}

export function subscribeNotifications(
  callback: (notifications: StoredNotification[]) => void
) {
  subscribers.add(callback)
  return () => {
    subscribers.delete(callback)
  }
}

export function getNotificationsForUser(userId: string) {
  return readAllNotifications()
    .filter((notification) => notification.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

export function getUnreadNotificationCount(userId: string) {
  return getNotificationsForUser(userId).filter((notification) => !notification.read)
    .length
}

export function markNotificationAsRead(notificationId: string) {
  const notifications = readAllNotifications()
  const updated = notifications.map((item) =>
    item.id === notificationId ? { ...item, read: true } : item
  )

  writeAllNotifications(updated)
  return updated.find((item) => item.id === notificationId) ?? null
}

export function addNotification(params: {
  userId: string
  type: string
  title: string
  description: string
  requestId?: string
  actionUrl?: string
}) {
  const notification: StoredNotification = {
    id: `NTF-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    userId: params.userId,
    type: params.type,
    title: params.title,
    description: params.description,
    requestId: params.requestId,
    actionUrl: params.actionUrl ?? params.requestId ? `/requests/${params.requestId}` : undefined,
    createdAt: new Date().toISOString(),
    read: false,
  }

  const notifications = [notification, ...readAllNotifications()]
  writeAllNotifications(notifications)
  return notification
}

function getAdminUserIds() {
  return mockUsers
    .filter((user) =>
      ["Admin", "Super Admin"].includes(user.role)
    )
    .map((user) => user.id)
}

function getHrTeamUserIds() {
  return mockUsers
    .filter((user) =>
      ["Admin", "Super Admin", "Manager"].includes(user.role)
    )
    .map((user) => user.id)
}

export function createRequestUpdateNotifications(params: {
  requestId: string
  requestTitle: string
  module: string
  requestOwnerId: string
  actionUserId?: string
  preview?: string
  updateType: "status" | "comment" | "request_updated"
}) {
  const { requestId, requestTitle, module, requestOwnerId, actionUserId, preview, updateType } = params

  const recipients = new Set<string>()

  // Admin team sees all request updates
  getAdminUserIds().forEach((id) => recipients.add(id))

  // Request owner sees updates to their own requests
  if (requestOwnerId && requestOwnerId !== actionUserId) {
    recipients.add(requestOwnerId)
  }

  // HR team sees HR module updates
  if (module.toLowerCase() === "hr") {
    getHrTeamUserIds().forEach((id) => recipients.add(id))
  }

  const title =
    updateType === "status"
      ? `Request status updated: ${requestTitle}`
      : updateType === "comment"
      ? `New comment on request: ${requestTitle}`
      : `Request updated: ${requestTitle}`

  const description =
    updateType === "status"
      ? `A request update happened on ${requestTitle}`
      : updateType === "comment"
      ? preview
        ? preview.length > 60
          ? `${preview.slice(0, 60)}...`
          : preview
        : "A new comment was added."
      : `A request update occurred.`

  recipients.forEach((userId) => {
    addNotification({
      userId,
      type: updateType,
      title,
      description,
      requestId,
      actionUrl: `/requests/${requestId}`,
    })
  })
}
