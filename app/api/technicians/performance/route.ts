import { NextRequest } from "next/server"
import {
  calculateTechnicianPerformance,
  getAllTechnicianPerformance,
} from "@/lib/services/technician-performance.service"

// GET /api/technicians/performance - Get all technicians performance
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const technicianId = searchParams.get("technicianId")

    if (technicianId) {
      const performance = await calculateTechnicianPerformance(technicianId)
      if (!performance) {
        return Response.json({ error: "Technician not found" }, { status: 404 })
      }
      return Response.json(performance)
    }

    const performances = await getAllTechnicianPerformance()
    return Response.json(performances)
  } catch (error: any) {
    console.error("Error fetching technician performance:", error)
    return Response.json(
      { error: error.message || "Failed to fetch performance" },
      { status: 500 }
    )
  }
}

