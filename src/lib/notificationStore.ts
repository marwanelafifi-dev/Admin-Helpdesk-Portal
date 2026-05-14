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

type RequestUpdateType = "status" | "comment" | "request_updated"

const STORAGE_KEY = "arp_notifications"
const ADMIN_HELPDESK_EMAIL = "adminhelpdesk@si-ware.com"
const subscribers = new Set<(notifications: StoredNotification[]) => void>()

// BroadcastChannel for cross-tab sync (Phase D)
let broadcastChannel: BroadcastChannel | null = null

function getBroadcastChannel(): BroadcastChannel | null {
  if (typeof window === "undefined") return null
  if (!broadcastChannel) {
    try {
      broadcastChannel = new BroadcastChannel("arp_notifications")
      broadcastChannel.onmessage = (event) => {
        if (event.data?.type === "notifications_updated") {
          const notifications = readAllNotificationsRaw()
          subscribers.forEach((cb) => cb(notifications))
        }
      }
    } catch {
      // BroadcastChannel not supported
    }
  }
  return broadcastChannel
}

function readAllNotificationsRaw(): StoredNotification[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as StoredNotification[]) : []
  } catch {
    return []
  }
}

function readAllNotifications(): StoredNotification[] {
  if (typeof window === "undefined") return []
  return readAllNotificationsRaw()
}

function writeAllNotifications(notifications: StoredNotification[]) {
  if (typeof window === "undefined") return

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications))
  subscribers.forEach((callback) => callback(notifications))

  // Broadcast to other tabs
  getBroadcastChannel()?.postMessage({ type: "notifications_updated" })
}

export function subscribeNotifications(
  callback: (notifications: StoredNotification[]) => void
) {
  // Ensure BroadcastChannel is wired up when the first subscriber registers
  getBroadcastChannel()
  subscribers.add(callback)
  return () => {
    subscribers.delete(callback)
  }
}

export function getNotificationsForUser(userId: string) {
  return readAllNotifications()
    .filter((n) => n.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

export function getUnreadNotificationCount(userId: string) {
  return getNotificationsForUser(userId).filter((n) => !n.read).length
}

export function markNotificationAsRead(notificationId: string) {
  const notifications = readAllNotifications()
  const updated = notifications.map((item) =>
    item.id === notificationId ? { ...item, read: true } : item
  )
  writeAllNotifications(updated)
  return updated.find((item) => item.id === notificationId) ?? null
}

export function markAllNotificationsAsRead(userId: string) {
  const notifications = readAllNotifications()
  const updated = notifications.map((item) =>
    item.userId === userId ? { ...item, read: true } : item
  )
  writeAllNotifications(updated)
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
    actionUrl: params.actionUrl ?? (params.requestId ? `/requests/${params.requestId}` : undefined),
    createdAt: new Date().toISOString(),
    read: false,
  }

  const notifications = [notification, ...readAllNotifications()]
  writeAllNotifications(notifications)
  return notification
}

function getAdminUserIds() {
  return mockUsers
    .filter((u) => ["Admin", "Super Admin"].includes(u.role))
    .map((u) => u.id)
}

function getHrTeamUserIds() {
  return mockUsers
    .filter((u) => ["Admin", "Super Admin", "Manager"].includes(u.role))
    .map((u) => u.id)
}

function getUserEmail(userId: string) {
  return mockUsers.find((u) => u.id === userId)?.email
}

function notifyByEmail(params: {
  recipientIds: string[]
  ccEmails?: string[]
  requestOwnerEmail?: string
  actionUserEmail?: string
  updateType: RequestUpdateType
  requestId: string
  requestTitle: string
  module: string
  actionUserName?: string
  preview?: string
  previousStatus?: string
  newStatus?: string
}) {
  if (typeof window === "undefined") return

  const emails = params.recipientIds
    .map(getUserEmail)
    .filter((email): email is string => Boolean(email))

  const requestOwnerEmail = params.requestOwnerEmail?.trim()
  const actionUserEmail = params.actionUserEmail?.toLowerCase()

  const recipients = Array.from(new Set(emails)).filter((email) => {
    const e = email.toLowerCase()
    return e === requestOwnerEmail?.toLowerCase() || e !== actionUserEmail
  })

  const requiredRecipients = [requestOwnerEmail, ADMIN_HELPDESK_EMAIL].filter(
    (email): email is string => Boolean(email)
  )

  requiredRecipients.forEach((req) => {
    if (!recipients.some((e) => e.toLowerCase() === req.toLowerCase())) {
      recipients.push(req)
    }
  })

  const uniqueRecipients = Array.from(
    new Map(recipients.map((e) => [e.toLowerCase(), e])).values()
  )

  if (uniqueRecipients.length === 0) return

  // CC emails: remove the action user, deduplicate
  const ccEmails = (params.ccEmails ?? [])
    .filter((e): e is string => Boolean(e))
    .filter((e) => e.toLowerCase() !== actionUserEmail)
    .filter((e) => !uniqueRecipients.some((r) => r.toLowerCase() === e.toLowerCase()))

  console.info("[notifications] Sending request update email", {
    requestId: params.requestId,
    updateType: params.updateType,
    to: uniqueRecipients,
    cc: ccEmails,
  })

  void fetch("/api/notifications/email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      to: uniqueRecipients,
      cc: ccEmails.length > 0 ? ccEmails : undefined,
      updateType: params.updateType,
      requestId: params.requestId,
      requestTitle: params.requestTitle,
      module: params.module,
      actorName: params.actionUserName,
      preview: params.preview,
      previousStatus: params.previousStatus,
      newStatus: params.newStatus,
    }),
  })
    .then(async (response) => {
      if (response.ok) return
      const errorText = await response.text()
      console.error("Failed to send request update email", {
        status: response.status,
        error: errorText,
      })
    })
    .catch((error) => {
      console.error("Failed to send request update email", error)
    })
}

export function createRequestUpdateNotifications(params: {
  requestId: string
  requestTitle: string
  module: string
  requestOwnerId: string
  requestOwnerEmail?: string
  actionUserId?: string
  actionUserName?: string
  actionUserEmail?: string
  preview?: string
  previousStatus?: string
  newStatus?: string
  updateType: RequestUpdateType
  ccEmails?: string[]
}) {
  const {
    requestId,
    requestTitle,
    module,
    requestOwnerId,
    actionUserId,
    preview,
    previousStatus,
    newStatus,
    updateType,
    ccEmails,
  } = params

  const recipients = new Set<string>()

  getAdminUserIds().forEach((id) => recipients.add(id))

  if (requestOwnerId && requestOwnerId !== actionUserId) {
    recipients.add(requestOwnerId)
  }

  if (module.toLowerCase() === "hr") {
    getHrTeamUserIds().forEach((id) => recipients.add(id))
  }

  if (actionUserId) {
    recipients.delete(actionUserId)
  }

  const title =
    updateType === "status"
      ? `Request status updated: ${requestTitle}`
      : updateType === "comment"
      ? `New comment on request: ${requestTitle}`
      : `Request updated: ${requestTitle}`

  const description =
    updateType === "status"
      ? preview || `Status changed${previousStatus ? ` from ${previousStatus}` : ""}${newStatus ? ` to ${newStatus}` : ""}.`
      : updateType === "comment"
      ? preview
        ? preview.length > 60
          ? `${preview.slice(0, 60)}...`
          : preview
        : "A new comment was added."
      : `A request update occurred.`

  const recipientIds = Array.from(recipients)

  recipientIds.forEach((userId) => {
    addNotification({
      userId,
      type: updateType,
      title,
      description,
      requestId,
      actionUrl: `/requests/${requestId}`,
    })
  })

  notifyByEmail({
    recipientIds,
    ccEmails,
    requestOwnerEmail: params.requestOwnerEmail,
    actionUserEmail: params.actionUserEmail,
    updateType,
    requestId,
    requestTitle,
    module,
    actionUserName: params.actionUserName,
    preview: description,
    previousStatus,
    newStatus,
  })

  return recipientIds
}
