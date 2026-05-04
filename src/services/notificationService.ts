/**
 * Notification Service — localStorage-based notification system
 * Handles role-based notifications for status changes, pending approvals, and comments
 */

export type NotificationType = 'status_change' | 'pending_approval' | 'comment' | 'general'

export interface Notification {
  id: string
  userId: string
  type: NotificationType
  title: string
  message: string
  requestId: string
  requestTitle: string
  module: string
  read: boolean
  createdAt: string
  metadata?: Record<string, unknown>
}

export interface NotificationPreferences {
  userId: string
  role: string
  statusChanges: boolean
  pendingApprovals: boolean
  comments: boolean
  emailNotifications: boolean
}

const NOTIFICATIONS_KEY = "arp_notifications"
const PREFERENCES_KEY = "arp_notification_preferences"

function readNotifications(): Notification[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_KEY)
    return raw ? (JSON.parse(raw) as Notification[]) : []
  } catch {
    return []
  }
}

function writeNotifications(notifications: Notification[]): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications))
  } catch {
    console.error("Failed to write notifications to storage")
  }
}

function readPreferences(userId: string): NotificationPreferences {
  if (typeof window === "undefined") {
    return getDefaultPreferences(userId, "Requester")
  }
  try {
    const raw = localStorage.getItem(PREFERENCES_KEY)
    const all = raw ? (JSON.parse(raw) as NotificationPreferences[]) : []
    return all.find(p => p.userId === userId) || getDefaultPreferences(userId, "Requester")
  } catch {
    return getDefaultPreferences(userId, "Requester")
  }
}

function writePreferences(prefs: NotificationPreferences): void {
  if (typeof window === "undefined") return
  try {
    const raw = localStorage.getItem(PREFERENCES_KEY)
    const all = raw ? (JSON.parse(raw) as NotificationPreferences[]) : []
    const idx = all.findIndex(p => p.userId === prefs.userId)
    if (idx >= 0) {
      all[idx] = prefs
    } else {
      all.push(prefs)
    }
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(all))
  } catch {
    console.error("Failed to write preferences to storage")
  }
}

function getDefaultPreferences(userId: string, role: string): NotificationPreferences {
  return {
    userId,
    role,
    statusChanges: true,
    pendingApprovals: role !== "Requester",
    comments: true,
    emailNotifications: true,
  }
}

export function getNotifications(userId: string): Notification[] {
  return readNotifications().filter(n => n.userId === userId)
}

export function getUnreadCount(userId: string): number {
  return getNotifications(userId).filter(n => !n.read).length
}

export function markAsRead(notificationId: string): void {
  const notifications = readNotifications()
  const notification = notifications.find(n => n.id === notificationId)
  if (notification) {
    notification.read = true
    writeNotifications(notifications)
  }
}

export function markAllAsRead(userId: string): void {
  const notifications = readNotifications()
  notifications.forEach(n => {
    if (n.userId === userId && !n.read) {
      n.read = true
    }
  })
  writeNotifications(notifications)
}

export function deleteNotification(notificationId: string): void {
  const notifications = readNotifications()
  writeNotifications(notifications.filter(n => n.id !== notificationId))
}

export function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  requestId: string,
  requestTitle: string,
  module: string,
  metadata?: Record<string, unknown>
): Notification {
  const notification: Notification = {
    id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    userId,
    type,
    title,
    message,
    requestId,
    requestTitle,
    module,
    read: false,
    createdAt: new Date().toISOString(),
    metadata,
  }
  const notifications = readNotifications()
  notifications.push(notification)
  writeNotifications(notifications)
  return notification
}

export function getPreferences(userId: string): NotificationPreferences {
  return readPreferences(userId)
}

export function updatePreferences(prefs: NotificationPreferences): void {
  writePreferences(prefs)
}

export function notifyStatusChange(
  userId: string,
  requestId: string,
  requestTitle: string,
  module: string,
  newStatus: string
): void {
  const prefs = readPreferences(userId)
  if (!prefs.statusChanges) return

  createNotification(
    userId,
    'status_change',
    'Status Changed',
    `Request "${requestTitle}" status changed to ${newStatus}`,
    requestId,
    requestTitle,
    module,
    { newStatus }
  )
}

export function notifyPendingApproval(
  userId: string,
  requestId: string,
  requestTitle: string,
  module: string,
  requesterName: string
): void {
  const prefs = readPreferences(userId)
  if (!prefs.pendingApprovals) return

  createNotification(
    userId,
    'pending_approval',
    'Pending Approval',
    `Request from ${requesterName}: "${requestTitle}" awaiting your approval`,
    requestId,
    requestTitle,
    module,
    { requesterName }
  )
}

export function notifyNewComment(
  userId: string,
  requestId: string,
  requestTitle: string,
  module: string,
  commenterName: string,
  commentPreview: string
): void {
  const prefs = readPreferences(userId)
  if (!prefs.comments) return

  createNotification(
    userId,
    'comment',
    'New Comment',
    `${commenterName} commented on "${requestTitle}": ${commentPreview.slice(0, 50)}...`,
    requestId,
    requestTitle,
    module,
    { commenterName, commentPreview }
  )
}

export async function sendEmailNotification(
  userEmail: string,
  notification: Notification
): Promise<boolean> {
  try {
    console.log(`📧 Email sent to ${userEmail}:`, notification.title, notification.message)
    return true
  } catch (error) {
    console.error("Failed to send email:", error)
    return false
  }
}
