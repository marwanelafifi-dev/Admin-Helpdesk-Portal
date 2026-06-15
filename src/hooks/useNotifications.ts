import { useState, useEffect } from "react"
import { getNotificationsForUser, getUnreadNotificationCount, subscribeNotifications, StoredNotification } from "@/lib/notificationStore"

export function useNotifications(userId?: string) {
  const [notifications, setNotifications] = useState<StoredNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (!userId) {
      setNotifications([])
      setUnreadCount(0)
      return
    }

    const refresh = () => {
      const items = getNotificationsForUser(userId)
      setNotifications(items)
      setUnreadCount(getUnreadNotificationCount(userId))
    }

    refresh()
    const unsubscribe = subscribeNotifications(() => refresh())
    return unsubscribe
  }, [userId])

  return { notifications, unreadCount }
}
