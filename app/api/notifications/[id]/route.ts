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

    // Mark single notification as read
    if (body.action === "mark-read" || !body.action) {
      await markNotificationAsRead(id)
      return Response.json({ message: "Notification marked as read" })
    } else {
      return Response.json({ error: "Invalid action" }, { status: 400 })
    }
  } catch (error: any) {
    console.error("Error updating notification:", error)
    if (error.message?.includes("Invalid notification ID")) {
      return Response.json({ error: error.message }, { status: 400 })
    }
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

