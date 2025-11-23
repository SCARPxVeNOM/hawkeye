import { NextRequest } from "next/server"
import { getTechnicians } from "@/lib/services/technician.service"

// GET /api/technicians - Get all technicians
export async function GET(request: NextRequest) {
  try {
    const technicians = await getTechnicians()
    return Response.json(technicians)
  } catch (error: any) {
    console.error("Error fetching technicians:", error)
    return Response.json(
      { error: error.message || "Failed to fetch technicians" },
      { status: 500 }
    )
  }
}


