import { NextRequest } from "next/server"
import { markAllNotificationsAsRead } from "@/lib/services/notification.service"

// PATCH /api/notifications/all - Mark all notifications as read
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId } = body

    if (!userId) {
      return Response.json({ error: "User ID is required" }, { status: 400 })
    }

    await markAllNotificationsAsRead(userId)
    return Response.json({ message: "All notifications marked as read" })
  } catch (error: any) {
    console.error("Error marking all notifications as read:", error)
    return Response.json(
      { error: error.message || "Failed to mark all as read" },
      { status: 500 }
    )
  }
}

