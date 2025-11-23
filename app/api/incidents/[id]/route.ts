import { NextRequest } from "next/server"
import { getIncidentById, updateIncident, deleteIncident } from "@/lib/services/incident.service"
import { notifyIssueResolved, notifyTechnicianAssignment } from "@/lib/services/notification.service"
import { createIncidentUpdate } from "@/lib/services/incident-updates.service"

// GET /api/incidents/[id] - Get a specific incident
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const incident = await getIncidentById(id)

    if (!incident) {
      return Response.json({ error: "Incident not found" }, { status: 404 })
    }

    return Response.json(incident)
  } catch (error: any) {
    console.error("Error fetching incident:", error)
    
    if (error.message.includes("Invalid incident ID")) {
      return Response.json({ error: error.message }, { status: 400 })
    }
    
    return Response.json({ error: error.message || "Failed to fetch incident" }, { status: 500 })
  }
}

// PATCH /api/incidents/[id] - Update an incident
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const oldIncident = await getIncidentById(id)
    const incident = await updateIncident(id, body)

    // Create incident update record
    try {
      const updateComment = body.status !== oldIncident?.status
        ? `Status changed to ${body.status}`
        : body.assigned_to && body.assigned_to !== oldIncident?.assigned_to
        ? "Technician assigned"
        : "Incident updated"

      await createIncidentUpdate({
        incident_id: id,
        user_id: body.user_id || oldIncident?.user_id || "",
        status: body.status || incident.status,
        comment: updateComment,
      })
    } catch (updateError) {
      console.error("Failed to create incident update:", updateError)
    }

    // Send notifications based on updates
    try {
      // Notify user when incident is resolved
      if (body.status === "resolved" && oldIncident?.status !== "resolved") {
        await notifyIssueResolved(incident.user_id, id, incident.title)
      }
      
      // Notify technician when assigned
      if (body.assigned_to && body.assigned_to !== oldIncident?.assigned_to) {
        const technicianId = body.assigned_to
        await notifyTechnicianAssignment(
          technicianId,
          id,
          incident.title,
          incident.location
        )
      }
      
      // Notify user when status changes to in-progress (if not already)
      if (body.status === "in-progress" && oldIncident?.status !== "in-progress" && !body.assigned_to) {
        const { createNotification } = await import("@/lib/services/notification.service")
        await createNotification({
          user_id: incident.user_id,
          type: "technician_assigned",
          message: `Your incident "${incident.title}" is now being processed.`,
          metadata: { incident_id: id },
        })
      }
    } catch (notifError) {
      console.error("Failed to send notification:", notifError)
      // Don't fail the request if notification fails
    }

    return Response.json(incident)
  } catch (error: any) {
    console.error("Error updating incident:", error)
    
    if (error.message.includes("Invalid incident ID")) {
      return Response.json({ error: error.message }, { status: 400 })
    }
    if (error.message.includes("not found")) {
      return Response.json({ error: error.message }, { status: 404 })
    }
    
    return Response.json({ error: error.message || "Failed to update incident" }, { status: 500 })
  }
}

// DELETE /api/incidents/[id] - Delete an incident
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await deleteIncident(id)

    return Response.json({ message: "Incident deleted successfully" })
  } catch (error: any) {
    console.error("Error deleting incident:", error)
    
    if (error.message.includes("Invalid incident ID")) {
      return Response.json({ error: error.message }, { status: 400 })
    }
    if (error.message.includes("not found")) {
      return Response.json({ error: error.message }, { status: 404 })
    }
    
    return Response.json({ error: error.message || "Failed to delete incident" }, { status: 500 })
  }
}

