import { NextRequest } from "next/server"
import { getUnreadCount } from "@/lib/services/notification.service"

// GET /api/notifications/count - Get unread notification count
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get("userId")

    if (!userId) {
      return Response.json({ error: "User ID is required" }, { status: 400 })
    }

    const count = await getUnreadCount(userId)
    return Response.json({ count })
  } catch (error: any) {
    console.error("Error fetching notification count:", error)
    return Response.json({ error: error.message || "Failed to fetch notification count" }, { status: 500 })
  }
}

