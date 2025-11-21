import { NextRequest } from "next/server"
import { getUserNotifications, getUnreadCount } from "@/lib/services/notification.service"

// GET /api/notifications - Get user notifications
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get("userId")
    const unreadOnly = searchParams.get("unreadOnly") === "true"
    const limit = parseInt(searchParams.get("limit") || "50")

    if (!userId) {
      return Response.json({ error: "User ID is required" }, { status: 400 })
    }

    const notifications = await getUserNotifications(userId, {
      unreadOnly,
      limit,
    })

    return Response.json(notifications)
  } catch (error: any) {
    console.error("Error fetching notifications:", error)
    return Response.json({ error: error.message || "Failed to fetch notifications" }, { status: 500 })
  }
}

