/**
 * Technician Performance Service
 * Tracks and calculates technician performance metrics
 */

import { getDb } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { getIncidents } from "./incident.service"

export interface TechnicianPerformance {
  technician_id: string
  technician_name: string
  total_assignments: number
  completed_assignments: number
  in_progress_assignments: number
  average_response_time: number // in minutes
  average_resolution_time: number // in minutes
  sla_compliance_rate: number // percentage
  on_time_completions: number
  overdue_completions: number
  category_breakdown: Record<string, number>
}

const SLA_MINUTES = 15 // SLA requirement in minutes

/**
 * Calculate technician performance
 */
export async function calculateTechnicianPerformance(
  technicianId: string
): Promise<TechnicianPerformance | null> {
  const db = await getDb()
  const usersCollection = db.collection("users")
  const scheduleCollection = db.collection("technician_schedule")

  // Get technician info
  const technician = await usersCollection.findOne({
    _id: new ObjectId(technicianId),
    role: "technician",
  })

  if (!technician) {
    return null
  }

  // Get all incidents assigned to this technician
  const incidents = await getIncidents({ assignedTo: technicianId })

  // Get all schedules for this technician
  const schedules = await scheduleCollection
    .find({ technician_id: technicianId })
    .toArray()

  // Calculate metrics
  const totalAssignments = incidents.length
  const completedAssignments = incidents.filter(
    (inc) => inc.status === "resolved"
  ).length
  const inProgressAssignments = incidents.filter(
    (inc) => inc.status === "in-progress"
  ).length

  // Calculate response times (time from incident creation to assignment)
  const responseTimes: number[] = []
  const resolutionTimes: number[] = []
  let onTimeCompletions = 0
  let overdueCompletions = 0
  const categoryBreakdown: Record<string, number> = {}

  incidents.forEach((incident) => {
    // Response time: time from creation to first assignment
    const createdTime = new Date(incident.created_at)
    const schedule = schedules.find(
      (s) => s.incident_id === incident.id
    )
    
    if (schedule) {
      const scheduledTime = new Date(schedule.scheduled_time)
      const responseTime = Math.floor(
        (scheduledTime.getTime() - createdTime.getTime()) / 60000
      )
      responseTimes.push(responseTime)

      // Check SLA compliance
      if (responseTime <= SLA_MINUTES) {
        onTimeCompletions++
      } else {
        overdueCompletions++
      }
    }

    // Resolution time: time from creation to resolution
    if (incident.resolved_at) {
      const resolvedTime = new Date(incident.resolved_at)
      const resolutionTime = Math.floor(
        (resolvedTime.getTime() - createdTime.getTime()) / 60000
      )
      resolutionTimes.push(resolutionTime)
    }

    // Category breakdown
    categoryBreakdown[incident.category] =
      (categoryBreakdown[incident.category] || 0) + 1
  })

  const averageResponseTime =
    responseTimes.length > 0
      ? Math.round(
          responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
        )
      : 0

  const averageResolutionTime =
    resolutionTimes.length > 0
      ? Math.round(
          resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length
        )
      : 0

  const slaComplianceRate =
    totalAssignments > 0
      ? Math.round((onTimeCompletions / totalAssignments) * 100)
      : 100

  return {
    technician_id: technicianId,
    technician_name: technician.name,
    total_assignments: totalAssignments,
    completed_assignments: completedAssignments,
    in_progress_assignments: inProgressAssignments,
    average_response_time: averageResponseTime,
    average_resolution_time: averageResolutionTime,
    sla_compliance_rate: slaComplianceRate,
    on_time_completions: onTimeCompletions,
    overdue_completions: overdueCompletions,
    category_breakdown: categoryBreakdown,
  }
}

/**
 * Get performance for all technicians
 */
export async function getAllTechnicianPerformance(): Promise<
  TechnicianPerformance[]
> {
  const db = await getDb()
  const usersCollection = db.collection("users")

  const technicians = await usersCollection
    .find({ role: "technician" })
    .toArray()

  const performances = await Promise.all(
    technicians.map((tech) =>
      calculateTechnicianPerformance(tech._id.toString())
    )
  )

  return performances.filter(
    (p): p is TechnicianPerformance => p !== null
  )
}

