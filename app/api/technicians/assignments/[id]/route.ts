import { NextRequest } from "next/server"
import { updateScheduleStatus, getScheduleById } from "@/lib/services/technician.service"
import { updateIncident, getIncidentById } from "@/lib/services/incident.service"
import { notifyIssueResolved, createNotification } from "@/lib/services/notification.service"
import { getDb } from "@/lib/mongodb"
import { ObjectId } from "mongodb"

// PATCH /api/technicians/assignments/[id] - Update assignment status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { status, completion_image, incident_id } = body

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

    // Handle completion with image upload
    if (status === "completed" && incident) {
      const updateData: any = {
        status: "resolved",
        resolved_at: new Date(),
        completion_image: completion_image || null,
      }

      // Get technician ID from request (from technician dashboard)
      // Try to extract from assignment or use a default
      let technicianId: string | null = null
      if (id.startsWith("direct-")) {
        // For direct assignments, get from incident
        technicianId = incident.assigned_to || null
      } else {
        const schedule = await getScheduleById(id)
        if (schedule) {
          technicianId = schedule.technician_id
        }
      }

      if (technicianId) {
        updateData.completed_by = technicianId
        updateData.completed_at = new Date()
      }

      // Update incident with completion details
      await updateIncident(incidentId!, updateData)

      // Notify user that issue is resolved
      try {
        await notifyIssueResolved(incident.user_id, incidentId!, incident.title)
      } catch (notifError) {
        console.error("Failed to send completion notification to user:", notifError)
      }

      // Notify all admins about completion
      try {
        const db = await getDb()
        const usersCollection = db.collection("users")
        const admins = await usersCollection.find({ role: "admin" }).toArray()

        for (const admin of admins) {
          await createNotification({
            user_id: admin._id.toString(),
            type: "task_completed",
            message: `Task "${incident.title}" has been completed by technician. ${completion_image ? "Completion image uploaded." : ""}`,
            metadata: {
              incident_id: incidentId,
              incident_title: incident.title,
              location: incident.location,
              completion_image: completion_image || null,
              completed_by: technicianId,
            },
          })
        }
      } catch (adminNotifError) {
        console.error("Failed to send completion notification to admins:", adminNotifError)
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

