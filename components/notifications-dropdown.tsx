"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Bell, Check, X, AlertCircle, User, Calendar, CheckCircle2 } from "lucide-react"

interface Notification {
  id: string
  type: string
  message: string
  read: boolean
  created_at: string
  metadata?: any
}

interface NotificationsDropdownProps {
  userId: string
}

export default function NotificationsDropdown({ userId }: NotificationsDropdownProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (userId) {
      fetchNotifications()
      fetchUnreadCount()
      // Poll for new notifications every 30 seconds
      const interval = setInterval(() => {
        fetchNotifications()
        fetchUnreadCount()
      }, 30000)
      return () => clearInterval(interval)
    }
  }, [userId])

  const fetchNotifications = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/notifications?userId=${userId}&limit=10`)
      if (response.ok) {
        const data = await response.json()
        setNotifications(data)
      }
    } catch (error) {
      console.error("Error fetching notifications:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchUnreadCount = async () => {
    try {
      const response = await fetch(`/api/notifications/count?userId=${userId}`)
      if (response.ok) {
        const data = await response.json()
        setUnreadCount(data.count || 0)
      }
    } catch (error) {
      console.error("Error fetching unread count:", error)
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      await fetch(`/api/notifications/${notificationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark-read" }),
      })
      fetchNotifications()
      fetchUnreadCount()
    } catch (error) {
      console.error("Error marking notification as read:", error)
    }
  }

  const markAllAsRead = async () => {
    try {
      await fetch(`/api/notifications/all`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      })
      fetchNotifications()
      fetchUnreadCount()
    } catch (error) {
      console.error("Error marking all as read:", error)
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "new_complaint":
        return <AlertCircle className="h-4 w-4 text-blue-500" />
      case "technician_assigned":
        return <User className="h-4 w-4 text-green-500" />
      case "issue_resolved":
        return <CheckCircle2 className="h-4 w-4 text-teal-500" />
      case "sla_exceeded":
      case "escalation":
        return <AlertCircle className="h-4 w-4 text-red-500" />
      case "prediction_alert":
        return <Calendar className="h-4 w-4 text-amber-500" />
      default:
        return <Bell className="h-4 w-4 text-muted-foreground" />
    }
  }

  const unreadNotifications = notifications.filter((n) => !n.read)

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <Card className="absolute right-0 top-12 w-96 max-h-[500px] overflow-y-auto z-50 shadow-lg">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold">Notifications</h3>
              {unreadNotifications.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  className="text-xs"
                >
                  Mark all read
                </Button>
              )}
            </div>

            <div className="divide-y divide-border">
              {loading ? (
                <div className="p-8 text-center text-muted-foreground">Loading...</div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  No notifications
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 hover:bg-muted/50 transition-colors ${
                      !notification.read ? "bg-blue-50/50 dark:bg-blue-950/20" : ""
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {getNotificationIcon(notification.type)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(notification.created_at).toLocaleString()}
                        </p>
                      </div>
                      {!notification.read && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => markAsRead(notification.id)}
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </>
      )}
    </div>
  )
}

