import { NextRequest } from "next/server"
import {
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
} from "@/lib/services/notification.service"

// PATCH /api/notifications/[id] - Mark notification as read
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    if (body.action === "mark-all-read") {
      // Mark all as read for a user
      const userId = body.userId
      if (!userId) {
        return Response.json({ error: "User ID is required" }, { status: 400 })
      }
      await markAllNotificationsAsRead(userId)
      return Response.json({ message: "All notifications marked as read" })
    } else {
      // Mark single notification as read
      await markNotificationAsRead(id)
      return Response.json({ message: "Notification marked as read" })
    }
  } catch (error: any) {
    console.error("Error updating notification:", error)
    return Response.json({ error: error.message || "Failed to update notification" }, { status: 500 })
  }
}

// DELETE /api/notifications/[id] - Delete notification
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await deleteNotification(id)
    return Response.json({ message: "Notification deleted successfully" })
  } catch (error: any) {
    console.error("Error deleting notification:", error)
    return Response.json({ error: error.message || "Failed to delete notification" }, { status: 500 })
  }
}

