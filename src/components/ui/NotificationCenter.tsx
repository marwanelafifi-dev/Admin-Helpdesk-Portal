"use client"

import { useState, useEffect } from "react"
import { Bell, X, Check, Settings } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  type Notification,
} from "@/services/notificationService"

interface NotificationCenterProps {
  userId: string
}

export function NotificationCenter({ userId }: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    const notifs = getNotifications(userId)
    setNotifications(notifs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()))
    setUnreadCount(getUnreadCount(userId))
  }, [userId])

  const handleMarkAsRead = (id: string) => {
    markAsRead(id)
    const updated = getNotifications(userId)
    setNotifications(updated.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()))
    setUnreadCount(getUnreadCount(userId))
  }

  const handleDelete = (id: string) => {
    deleteNotification(id)
    const updated = getNotifications(userId)
    setNotifications(updated.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()))
    setUnreadCount(getUnreadCount(userId))
  }

  const handleMarkAllAsRead = () => {
    markAllAsRead(userId)
    const updated = getNotifications(userId)
    setNotifications(updated.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()))
    setUnreadCount(getUnreadCount(userId))
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'status_change':
        return "📋"
      case 'pending_approval':
        return "⏳"
      case 'comment':
        return "💬"
      default:
        return "ℹ️"
    }
  }

  const formatTime = (iso: string) => {
    const date = new Date(iso)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return "just now"
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-semibold">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white border border-gray-200 rounded-lg shadow-xl z-50 max-h-96 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Notifications</h3>
            <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Notifications List */}
          <div className="overflow-y-auto flex-1">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Bell className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p>No notifications yet</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <Link
                  key={notif.id}
                  href={`/requests/${notif.requestId}`}
                  onClick={() => {
                    handleMarkAsRead(notif.id)
                    setIsOpen(false)
                  }}
                  className={cn(
                    "block px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors",
                    !notif.read && "bg-blue-50"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-lg">{getNotificationIcon(notif.type)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{notif.title}</p>
                          <p className="text-gray-600 text-xs mt-1 line-clamp-2">{notif.message}</p>
                        </div>
                        {!notif.read && <div className="h-2 w-2 rounded-full bg-blue-600 flex-shrink-0 mt-1" />}
                      </div>
                      <p className="text-gray-400 text-xs mt-2">{formatTime(notif.createdAt)}</p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        handleDelete(notif.id)
                      }}
                      className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </Link>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t border-gray-100 p-3 flex gap-2">
              <button
                onClick={handleMarkAllAsRead}
                className="flex-1 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded transition-colors flex items-center justify-center gap-2"
              >
                <Check className="h-4 w-4" />
                Mark all as read
              </button>
              <Link
                href="/notifications"
                className="flex-1 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded transition-colors flex items-center justify-center gap-2"
                onClick={() => setIsOpen(false)}
              >
                <Settings className="h-4 w-4" />
                Settings
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
