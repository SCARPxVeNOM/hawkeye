import { NextRequest } from "next/server"
import { getTechnicianSchedules } from "@/lib/services/technician.service"
import { getIncidentById, getIncidents } from "@/lib/services/incident.service"
import { getPriorityLabel } from "@/lib/services/priority.service"
import { getDb } from "@/lib/mongodb"
import { ObjectId } from "mongodb"

// GET /api/technicians/[id]/assignments - Get assignments for a technician
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // Get assignments from schedule collection
    const schedules = await getTechnicianSchedules(id)
    
    // Also get incidents directly assigned to this technician (via assigned_to field)
    const assignedIncidents = await getIncidents({ assignedTo: id })
    
    console.log(`Technician ${id}: Found ${schedules.length} schedules and ${assignedIncidents.length} direct assignments`)
    
    // Create a map to track which incidents already have schedules
    const scheduledIncidentIds = new Set(schedules.map(s => s.incident_id))
    
    // Enrich schedules with incident details
    const scheduleAssignments = await Promise.all(
      schedules.map(async (schedule) => {
        const incident = await getIncidentById(schedule.incident_id)
        const priorityNum = incident?.priority || 3
        return {
          id: schedule.id,
          incident_id: schedule.incident_id,
          incident_title: incident?.title || "Unknown",
          description: incident?.description || "",
          category: incident?.category || "",
          location: incident?.location || "Unknown",
          priority: priorityNum,
          priority_label: getPriorityLabel(priorityNum),
          created_at: incident?.created_at || new Date().toISOString(),
          scheduled_time: schedule.scheduled_time,
          status: schedule.status,
        }
      })
    )
    
    // Convert assigned incidents (without schedules) to assignment format
    const directAssignments = assignedIncidents
      .filter(incident => {
        // Include all assigned incidents, even if they have a schedule (schedule might be outdated)
        // But prefer schedule data if it exists
        return true
      })
      .filter(incident => !scheduledIncidentIds.has(incident.id!))
      .map(incident => {
        const priorityNum = incident.priority || 3
        // Determine status: if incident is resolved, mark as completed; otherwise use incident status
        let assignmentStatus = "scheduled"
        if (incident.status === "resolved" || incident.status === "closed") {
          assignmentStatus = "completed"
        } else if (incident.status === "in-progress" || incident.status === "in_progress") {
          assignmentStatus = "in-progress"
        } else {
          assignmentStatus = "scheduled"
        }
        
        return {
          id: `direct-${incident.id}`, // Use a prefix to distinguish from schedule IDs
          incident_id: incident.id!,
          incident_title: incident.title,
          description: incident.description || "",
          category: incident.category || "",
          location: incident.location,
          priority: priorityNum,
          priority_label: getPriorityLabel(priorityNum),
          created_at: incident.created_at || new Date().toISOString(),
          scheduled_time: incident.sla_started_at 
            ? (typeof incident.sla_started_at === 'string' 
                ? incident.sla_started_at 
                : new Date(incident.sla_started_at).toISOString())
            : new Date().toISOString(), // Use SLA start time or current time
          status: assignmentStatus,
        }
      })
    
    // Combine both types of assignments
    const allAssignments = [...scheduleAssignments, ...directAssignments]
    
    console.log(`Technician ${id}: Returning ${allAssignments.length} total assignments`)
    
    // Sort by scheduled_time
    allAssignments.sort((a, b) => 
      new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime()
    )

    return Response.json(allAssignments)
  } catch (error: any) {
    console.error("Error fetching technician assignments:", error)
    return Response.json(
      { error: error.message || "Failed to fetch assignments" },
      { status: 500 }
    )
  }
}

