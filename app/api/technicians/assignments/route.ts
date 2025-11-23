import { NextRequest } from "next/server"
import { getTechnicians } from "@/lib/services/technician.service"
import { getIncidents } from "@/lib/services/incident.service"
import { getTechnicianSchedules } from "@/lib/services/technician.service"
import { getIncidentById } from "@/lib/services/incident.service"
import { getPriorityLabel } from "@/lib/services/priority.service"

// GET /api/technicians/assignments - Get all assignments across all technicians
export async function GET(request: NextRequest) {
  try {
    // Get all technicians
    const technicians = await getTechnicians()
    
    // Get all assigned incidents
    const allAssignedIncidents = await getIncidents({})
    const assignedIncidents = allAssignedIncidents.filter(inc => inc.assigned_to)
    
    // Get all schedules
    const allSchedules: any[] = []
    for (const tech of technicians) {
      const schedules = await getTechnicianSchedules(tech.id)
      allSchedules.push(...schedules)
    }
    
    // Create a map of incident IDs to schedules
    const scheduleMap = new Map<string, any>()
    allSchedules.forEach(schedule => {
      scheduleMap.set(schedule.incident_id, schedule)
    })
    
    // Build assignments array
    const assignments: any[] = []
    
    // Process assigned incidents
    for (const incident of assignedIncidents) {
      const schedule = scheduleMap.get(incident.id!)
      const technician = technicians.find(t => t.id === incident.assigned_to)
      
      if (!technician) continue
      
      const priorityNum = incident.priority || 3
      const assignment = {
        id: schedule?.id || `direct-${incident.id}`,
        incident_id: incident.id!,
        technician_id: technician.id,
        technician_name: technician.name,
        incident_title: incident.title,
        location: incident.location,
        category: incident.category,
        scheduled_time: schedule?.scheduled_time 
          ? (schedule.scheduled_time instanceof Date 
              ? schedule.scheduled_time.toISOString() 
              : schedule.scheduled_time)
          : incident.sla_started_at 
            ? (incident.sla_started_at instanceof Date 
                ? new Date(new Date(incident.sla_started_at).getTime() + 5 * 60 * 1000).toISOString()
                : new Date(new Date(incident.sla_started_at).getTime() + 5 * 60 * 1000).toISOString())
            : new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        duration_minutes: schedule?.duration_minutes || 30,
        status: incident.status === "resolved" 
          ? "completed" 
          : incident.status === "in-progress" 
            ? "in-progress" 
            : "scheduled",
        priority: priorityNum,
        priority_label: getPriorityLabel(priorityNum),
        created_at: incident.created_at || new Date().toISOString(),
        sla_deadline: incident.sla_deadline 
          ? (incident.sla_deadline instanceof Date 
              ? incident.sla_deadline.toISOString() 
              : incident.sla_deadline)
          : null,
      }
      
      assignments.push(assignment)
    }
    
    // Sort by scheduled_time
    assignments.sort((a, b) => 
      new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime()
    )
    
    return Response.json(assignments)
  } catch (error: any) {
    console.error("Error fetching all assignments:", error)
    return Response.json(
      { error: error.message || "Failed to fetch assignments" },
      { status: 500 }
    )
  }
}

