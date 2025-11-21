import { NextRequest } from "next/server"
import { getTechnicianSchedules } from "@/lib/services/technician.service"
import { getIncidentById } from "@/lib/services/incident.service"

// GET /api/technicians/[id]/assignments - Get assignments for a technician
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const schedules = await getTechnicianSchedules(id)

    // Enrich with incident details
    const assignments = await Promise.all(
      schedules.map(async (schedule) => {
        const incident = await getIncidentById(schedule.incident_id)
        return {
          id: schedule.id,
          incident_id: schedule.incident_id,
          incident_title: incident?.title || "Unknown",
          location: incident?.location || "Unknown",
          scheduled_time: schedule.scheduled_time,
          status: schedule.status,
        }
      })
    )

    return Response.json(assignments)
  } catch (error: any) {
    console.error("Error fetching technician assignments:", error)
    return Response.json(
      { error: error.message || "Failed to fetch assignments" },
      { status: 500 }
    )
  }
}

