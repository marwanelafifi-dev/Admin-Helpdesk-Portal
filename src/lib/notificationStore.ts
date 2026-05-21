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

// Cache of real admin users fetched from /api/users/admin-team
let _adminUserCache: { id: string; name: string; email: string; role: string }[] | null = null
let _adminUserCacheTime = 0
const CACHE_TTL = 60_000 // 1 minute

async function fetchAdminUsers() {
  const now = Date.now()
  if (_adminUserCache && now - _adminUserCacheTime < CACHE_TTL) return _adminUserCache
  try {
    const res = await fetch("/api/users/admin-team")
    const { data } = await res.json()
    _adminUserCache = Array.isArray(data) ? data : []
    _adminUserCacheTime = now
    return _adminUserCache
  } catch {
    return _adminUserCache ?? []
  }
}

function getAdminUserIds() {
  // Fallback to mock for sync contexts; real IDs loaded async in notifyByEmail
  return mockUsers
    .filter((u) => ["Admin", "Super Admin", "Full Access", "Administration Team"].includes(u.role))
    .map((u) => u.id)
}

function getHrTeamUserIds() {
  return mockUsers
    .filter((u) => ["Admin", "Super Admin", "Manager", "Full Access", "Administration Team"].includes(u.role))
    .map((u) => u.id)
}

function getUserEmail(userId: string) {
  return mockUsers.find((u) => u.id === userId)?.email
}

async function notifyByEmail(params: {
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

  const actionUserEmail = params.actionUserEmail?.toLowerCase()

  // Administration Team users + adminhelpdesk get ALL notifications
  const realAdmins = await fetchAdminUsers()
  const realAdminEmails = realAdmins.map((u) => u.email)

  // Request owner gets notified only when someone else acted on their request
  const ownerEmail =
    params.requestOwnerEmail &&
    params.requestOwnerEmail.toLowerCase() !== actionUserEmail
      ? params.requestOwnerEmail
      : undefined

  // Recipients: Administration Team + helpdesk + request owner (if not the actor)
  const allEmails = Array.from(new Set([
    ...realAdminEmails,
    ownerEmail,
    ADMIN_HELPDESK_EMAIL,
  ].filter((e): e is string => Boolean(e))))

  // Remove the person who triggered the action (don't self-notify)
  const uniqueRecipients = allEmails.filter(
    (e) => !actionUserEmail || e.toLowerCase() !== actionUserEmail
  )

  if (uniqueRecipients.length === 0) return

  const ccEmails = (params.ccEmails ?? [])
    .filter((e): e is string => Boolean(e))
    .filter((e) => e.toLowerCase() !== actionUserEmail)
    .filter((e) => !uniqueRecipients.some((r) => r.toLowerCase() === e.toLowerCase()))

  console.info("[notifications] Sending request update email", {
    requestId: params.requestId,
    updateType: params.updateType,
    to: uniqueRecipients,
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
  }).catch((error) => {
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

  // In-app: notify mock-based users by ID
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

  // In-app: also notify real admin users (from data/users.json) by their actual IDs
  void fetchAdminUsers().then((admins) => {
    admins.forEach((admin) => {
      if (admin.id !== actionUserId) {
        addNotification({
          userId: admin.id,
          type: updateType,
          title,
          description,
          requestId,
          actionUrl: `/requests/${requestId}`,
        })
      }
    })
  })

  void notifyByEmail({
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

/**
 * Notify administration team when a brand-new request is submitted.
 * Called from all module form submit handlers.
 */
/**
 * Notify a newly-assigned user that a request has been assigned to them.
 * Fires both an in-app notification and an email.
 */
export function createAssignmentNotifications(params: {
  requestId: string
  requestTitle: string
  module: string
  assigneeId: string
  assigneeName: string
  assigneeEmail: string
  actorName?: string
  actorEmail?: string
}) {
  if (typeof window === "undefined") return
  if (!params.assigneeId || !params.assigneeEmail) return

  const title = `You've been assigned a request: ${params.requestTitle}`
  const description = params.actorName ? `Assigned by ${params.actorName}` : "A request has been assigned to you."

  addNotification({
    userId: params.assigneeId,
    type: "request_updated",
    title,
    description,
    requestId: params.requestId,
    actionUrl: `/requests/${params.requestId}`,
  })

  const actorEmail = params.actorEmail?.toLowerCase()
  if (actorEmail && actorEmail === params.assigneeEmail.toLowerCase()) {
    // Self-assignment — skip the email (the in-app notification is enough).
    return
  }

  void fetch("/api/notifications/email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      to: [params.assigneeEmail],
      updateType: "request_updated",
      requestId: params.requestId,
      requestTitle: params.requestTitle,
      module: params.module,
      actorName: params.actorName,
      preview: `You have been assigned this ${params.module} request${params.actorName ? ` by ${params.actorName}` : ""}.`,
    }),
  }).catch(() => {})
}

export function createNewRequestNotifications(params: {
  requestId: string
  requestTitle: string
  module: string
  requesterId: string
  requesterName: string
  requesterEmail: string
  /** CC emails entered on the form (payload.ccEmails). */
  ccEmails?: string[]
  /** Email of the Direct Manager selected on the form, if any. */
  managerEmail?: string
}) {
  if (typeof window === "undefined") return

  const title = `New ${params.module} request: ${params.requestTitle}`
  const description = `Submitted by ${params.requesterName}`

  // In-app: notify mock admin IDs
  getAdminUserIds().forEach((userId) => {
    if (userId !== params.requesterId) {
      addNotification({
        userId,
        type: "request_updated",
        title,
        description,
        requestId: params.requestId,
        actionUrl: `/requests/${params.requestId}`,
      })
    }
  })

  // In-app: notify real admin users
  void fetchAdminUsers().then((admins) => {
    admins.forEach((admin) => {
      if (admin.id !== params.requesterId) {
        addNotification({
          userId: admin.id,
          type: "request_updated",
          title,
          description,
          requestId: params.requestId,
          actionUrl: `/requests/${params.requestId}`,
        })
      }
    })
  })

  // Email recipients:
  //   To: every Administration Team member + the requester + adminhelpdesk.
  //   Cc: form-provided CC emails + the selected Direct Manager (if any).
  //   Anyone already on the To: line is dropped from Cc.
  void fetchAdminUsers().then((admins) => {
    const adminEmails = admins.map((u) => u.email).filter(Boolean)

    const toSet = new Set<string>()
    const addTo = (e?: string) => {
      const trimmed = (e ?? "").trim().toLowerCase()
      if (trimmed) toSet.add(trimmed)
    }
    adminEmails.forEach(addTo)
    addTo(params.requesterEmail)
    addTo(ADMIN_HELPDESK_EMAIL)
    const recipients = Array.from(toSet)

    const ccSet = new Set<string>()
    const addCc = (e?: string) => {
      const trimmed = (e ?? "").trim().toLowerCase()
      if (trimmed && !toSet.has(trimmed)) ccSet.add(trimmed)
    }
    for (const e of (params.ccEmails ?? [])) addCc(e)
    addCc(params.managerEmail)
    const ccList = Array.from(ccSet)

    if (recipients.length === 0 && ccList.length === 0) return

    void fetch("/api/notifications/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: recipients,
        cc: ccList.length > 0 ? ccList : undefined,
        updateType: "request_updated",
        requestId: params.requestId,
        requestTitle: params.requestTitle,
        module: params.module,
        actorName: params.requesterName,
        preview: `New ${params.module} request submitted by ${params.requesterName}`,
      }),
    }).catch(() => {})
  })
}
