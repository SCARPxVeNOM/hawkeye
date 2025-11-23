/**
 * Technician Service
 * Handles technician-related operations and scheduling
 */

import { getDb } from "@/lib/mongodb"
import { ObjectId } from "mongodb"

export interface Technician {
  id: string
  name: string
  email: string
  specialization: string
  active: boolean
  available: boolean
  current_assignments: number
  max_concurrent: number
}

export interface TechnicianSchedule {
  id?: string
  technician_id: string
  incident_id: string
  scheduled_time: Date | string
  duration_minutes: number
  status: "scheduled" | "in-progress" | "completed" | "cancelled"
  created_at: Date | string
}

export interface CreateScheduleData {
  technician_id: string
  incident_id: string
  scheduled_time: Date | string
  duration_minutes?: number
}

/**
 * Get all technicians
 */
export async function getTechnicians(): Promise<Technician[]> {
  const db = await getDb()
  const usersCollection = db.collection("users")

  const technicians = await usersCollection
    .find({ role: "technician" })
    .toArray()

  return technicians.map((tech: any) => ({
    id: tech._id.toString(),
    name: tech.name,
    email: tech.email,
    specialization: tech.specialization || "General",
    active: tech.active !== false,
    available: tech.available !== false,
    current_assignments: tech.current_assignments || 0,
    max_concurrent: tech.max_concurrent || 2,
  }))
}

/**
 * Get technician by ID
 */
export async function getTechnicianById(id: string): Promise<Technician | null> {
  if (!ObjectId.isValid(id)) {
    throw new Error("Invalid technician ID format")
  }

  const db = await getDb()
  const usersCollection = db.collection("users")

  const technician = await usersCollection.findOne({
    _id: new ObjectId(id),
    role: "technician",
  })

  if (!technician) {
    return null
  }

  return {
    id: technician._id.toString(),
    name: technician.name,
    email: technician.email,
    specialization: technician.specialization || "General",
    active: technician.active !== false,
    available: technician.available !== false,
    current_assignments: technician.current_assignments || 0,
    max_concurrent: technician.max_concurrent || 2,
  }
}

/**
 * Check if technician has overlapping assignments
 */
export async function hasOverlappingSchedule(
  technicianId: string,
  scheduledTime: Date,
  durationMinutes: number
): Promise<boolean> {
  const db = await getDb()
  const scheduleCollection = db.collection("technician_schedule")

  const startTime = new Date(scheduledTime)
  const endTime = new Date(startTime.getTime() + durationMinutes * 60000)

  // Get all active schedules for this technician
  const activeSchedules = await scheduleCollection
    .find({
      technician_id: technicianId,
      status: { $in: ["scheduled", "in-progress"] },
    })
    .toArray()

  // Check for overlaps manually
  for (const schedule of activeSchedules) {
    const scheduleStart = new Date(schedule.scheduled_time)
    const scheduleEnd = new Date(
      scheduleStart.getTime() + (schedule.duration_minutes || 30) * 60000
    )

    // Check if there's any overlap
    if (
      (startTime >= scheduleStart && startTime < scheduleEnd) ||
      (endTime > scheduleStart && endTime <= scheduleEnd) ||
      (startTime <= scheduleStart && endTime >= scheduleEnd)
    ) {
      return true
    }
  }

  return false
}

/**
 * Create a technician schedule
 */
export async function createSchedule(
  data: CreateScheduleData
): Promise<TechnicianSchedule> {
  const db = await getDb()
  const scheduleCollection = db.collection("technician_schedule")

  const scheduledTime = new Date(data.scheduled_time)
  const durationMinutes = data.duration_minutes || 30

  // Check for overlapping schedules
  const hasOverlap = await hasOverlappingSchedule(
    data.technician_id,
    scheduledTime,
    durationMinutes
  )

  if (hasOverlap) {
    throw new Error("Technician has overlapping schedule at this time")
  }

  // Check technician availability
  const technician = await getTechnicianById(data.technician_id)
  if (!technician) {
    throw new Error("Technician not found")
  }

  if (!technician.available) {
    throw new Error("Technician is not available")
  }

  if (technician.current_assignments >= technician.max_concurrent) {
    throw new Error("Technician has reached maximum concurrent assignments")
  }

  const schedule = {
    technician_id: data.technician_id,
    incident_id: data.incident_id,
    scheduled_time: scheduledTime,
    duration_minutes: durationMinutes,
    status: "scheduled" as const,
    created_at: new Date(),
  }

  const result = await scheduleCollection.insertOne(schedule)

  // Update technician assignment count
  await updateTechnicianAssignmentCount(data.technician_id, 1)

  // Send notification to technician
  try {
    const { notifyTechnicianAssignment } = await import("./notification.service")
    const { getIncidentById } = await import("./incident.service")
    const incident = await getIncidentById(data.incident_id)
    
    if (incident) {
      await notifyTechnicianAssignment(
        data.technician_id,
        data.incident_id,
        incident.title,
        incident.location
      )
    }
  } catch (notifError) {
    console.error("Failed to send notification to technician:", notifError)
    // Don't fail the schedule creation if notification fails
  }

  return {
    id: result.insertedId.toString(),
    ...schedule,
    scheduled_time: scheduledTime.toISOString(),
    created_at: schedule.created_at.toISOString(),
  }
}

/**
 * Get a schedule by ID
 */
export async function getScheduleById(scheduleId: string): Promise<TechnicianSchedule | null> {
  if (!ObjectId.isValid(scheduleId)) {
    return null
  }

  const db = await getDb()
  const scheduleCollection = db.collection("technician_schedule")

  const schedule = await scheduleCollection.findOne({
    _id: new ObjectId(scheduleId),
  })

  if (!schedule) {
    return null
  }

  return {
    id: schedule._id.toString(),
    technician_id: schedule.technician_id,
    incident_id: schedule.incident_id,
    scheduled_time: schedule.scheduled_time instanceof Date
      ? schedule.scheduled_time.toISOString()
      : schedule.scheduled_time,
    duration_minutes: schedule.duration_minutes,
    status: schedule.status,
    created_at: schedule.created_at instanceof Date
      ? schedule.created_at.toISOString()
      : schedule.created_at,
  }
}

/**
 * Get schedules for a technician
 */
export async function getTechnicianSchedules(
  technicianId: string,
  options: { status?: string; limit?: number } = {}
): Promise<TechnicianSchedule[]> {
  const db = await getDb()
  const scheduleCollection = db.collection("technician_schedule")

  const query: any = { technician_id: technicianId }
  if (options.status) {
    query.status = options.status
  }

  const limit = options.limit || 50

  const schedules = await scheduleCollection
    .find(query)
    .sort({ scheduled_time: 1 })
    .limit(limit)
    .toArray()

  return schedules.map((schedule: any) => ({
    id: schedule._id.toString(),
    technician_id: schedule.technician_id,
    incident_id: schedule.incident_id,
    scheduled_time: schedule.scheduled_time.toISOString(),
    duration_minutes: schedule.duration_minutes,
    status: schedule.status,
    created_at: schedule.created_at.toISOString(),
  }))
}

/**
 * Update schedule status
 */
export async function updateScheduleStatus(
  scheduleId: string,
  status: "scheduled" | "in-progress" | "completed" | "cancelled"
): Promise<void> {
  if (!ObjectId.isValid(scheduleId)) {
    throw new Error("Invalid schedule ID format")
  }

  const db = await getDb()
  const scheduleCollection = db.collection("technician_schedule")

  await scheduleCollection.updateOne(
    { _id: new ObjectId(scheduleId) },
    { $set: { status } }
  )
}

/**
 * Update technician assignment count
 */
async function updateTechnicianAssignmentCount(
  technicianId: string,
  delta: number
): Promise<void> {
  const db = await getDb()
  const usersCollection = db.collection("users")

  await usersCollection.updateOne(
    { _id: new ObjectId(technicianId) },
    { $inc: { current_assignments: delta } }
  )
}

/**
 * Find available technicians for an incident
 */
export async function findAvailableTechnicians(
  category: string,
  scheduledTime?: Date
): Promise<Technician[]> {
  const technicians = await getTechnicians()

  // Filter by availability and capacity
  const available = technicians.filter(
    (tech) =>
      tech.active &&
      tech.available &&
      tech.current_assignments < tech.max_concurrent
  )

  // If scheduled time provided, check for overlaps
  if (scheduledTime) {
    const availableWithoutOverlaps: Technician[] = []
    
    for (const tech of available) {
      const hasOverlap = await hasOverlappingSchedule(
        tech.id,
        scheduledTime,
        30 // Default duration
      )
      
      if (!hasOverlap) {
        availableWithoutOverlaps.push(tech)
      }
    }
    
    return availableWithoutOverlaps
  }

  return available
}

/**
 * Auto-assign technician to incident
 */
export async function autoAssignTechnician(
  incidentId: string,
  category: string,
  scheduledTime?: Date
): Promise<TechnicianSchedule | null> {
  const availableTechnicians = await findAvailableTechnicians(category, scheduledTime)

  if (availableTechnicians.length === 0) {
    return null
  }

  // Simple algorithm: assign to technician with least current assignments
  const bestTechnician = availableTechnicians.sort(
    (a, b) => a.current_assignments - b.current_assignments
  )[0]

  const scheduleTime = scheduledTime || new Date(Date.now() + 15 * 60000) // 15 mins from now (SLA)

  return createSchedule({
    technician_id: bestTechnician.id,
    incident_id: incidentId,
    scheduled_time: scheduleTime,
    duration_minutes: 30,
  })
}

