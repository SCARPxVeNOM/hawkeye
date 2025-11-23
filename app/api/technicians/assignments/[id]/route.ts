import { NextRequest } from "next/server"
import { updateScheduleStatus, getScheduleById } from "@/lib/services/technician.service"
import { updateIncident, getIncidentById } from "@/lib/services/incident.service"
import { notifyIssueResolved } from "@/lib/services/notification.service"

// PATCH /api/technicians/assignments/[id] - Update assignment status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { status } = body

    if (!status || !["scheduled", "in-progress", "completed", "cancelled"].includes(status)) {
      return Response.json({ error: "Invalid status" }, { status: 400 })
    }

    let incidentId: string | null = null
    let incident: any = null

    // Check if this is a direct assignment (starts with "direct-")
    if (id.startsWith("direct-")) {
      // Extract incident ID from "direct-{incidentId}"
      incidentId = id.replace("direct-", "")
      
      // Map assignment status to incident status
      const incidentStatus = status === "completed" ? "resolved" :
                            status === "in-progress" ? "in-progress" :
                            status === "cancelled" ? "cancelled" : "in-progress"
      
      // Get incident before updating
      incident = await getIncidentById(incidentId)
      
      // Update the incident status directly
      await updateIncident(incidentId, { status: incidentStatus })
    } else {
      // This is a schedule-based assignment
      const schedule = await getScheduleById(id)
      if (schedule) {
        incidentId = schedule.incident_id
        incident = await getIncidentById(incidentId)
      }
      await updateScheduleStatus(id, status as any)
    }

    // Send notification when assignment is completed
    if (status === "completed" && incident) {
      try {
        await notifyIssueResolved(incident.user_id, incidentId!, incident.title)
      } catch (notifError) {
        console.error("Failed to send completion notification:", notifError)
        // Don't fail the request if notification fails
      }
    }

    return Response.json({ message: "Assignment updated successfully" })
  } catch (error: any) {
    console.error("Error updating assignment:", error)
    return Response.json(
      { error: error.message || "Failed to update assignment" },
      { status: 500 }
    )
  }
}

