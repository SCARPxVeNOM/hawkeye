/**
 * Critical Alert Assignment Service
 * Automatically assigns critical alerts to technicians based on specialization
 * and implements SLA tracking
 */

import { getDb } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { createIncident, CreateIncidentData } from "./incident.service"
import { getTechnicians, autoAssignTechnician, Technician } from "./technician.service"
import { createNotification } from "./notification.service"

// SLA Configuration
const SLA_MINUTES = 15 // 15 minutes SLA for critical alerts

// Quality Gates Configuration
const MIN_CONFIDENCE_THRESHOLD = 80 // Minimum confidence percentage
const MAX_DAYS_TO_FAILURE = 20 // Maximum days to failure for auto-assignment (not 30)
const MIN_MODEL_R2 = 0.7 // Minimum model R² score (if available)

// Rate Limiting Configuration
const MAX_ASSIGNMENTS_PER_TECHNICIAN_PER_DAY = 3
const MAX_SYSTEM_WIDE_ASSIGNMENTS_PER_DAY = 15
const DEDUPLICATION_WINDOW_HOURS = 48 // Check for existing incidents within this window
const COOLDOWN_PERIOD_HOURS = 24 // Can't auto-assign same location/category within this period

// Map incident categories to technician specializations
const CATEGORY_TO_SPECIALIZATION: Record<string, string[]> = {
  electricity: ["Electrical"],
  water: ["Plumbing"],
  it: ["IT"],
  hostel: ["General", "HVAC"],
  garbage: ["General"],
}

/**
 * Get technician specialization from category
 */
function getSpecializationForCategory(category: string): string[] {
  return CATEGORY_TO_SPECIALIZATION[category.toLowerCase()] || ["General"]
}

/**
 * Find technician by specialization matching category
 */
async function findTechnicianBySpecialization(
  category: string
): Promise<Technician | null> {
  const specializations = getSpecializationForCategory(category)
  const technicians = await getTechnicians()

  // First, try to find available technician with exact specialization match
  for (const specialization of specializations) {
    const matchingTech = technicians.find(
      (tech) =>
        tech.specialization.toLowerCase() === specialization.toLowerCase() &&
        tech.active &&
        tech.available &&
        tech.current_assignments < tech.max_concurrent
    )

    if (matchingTech) {
      return matchingTech
    }
  }

  // If no exact match, find any available technician
  const availableTech = technicians.find(
    (tech) =>
      tech.active &&
      tech.available &&
      tech.current_assignments < tech.max_concurrent
  )

  return availableTech || null
}

/**
 * Check if alert passes quality gates
 */
function passesQualityGates(alert: {
  days_to_next_failure: number
  confidence?: number
  model_r2?: number
}): boolean {
  // Check confidence threshold
  if (alert.confidence !== undefined && alert.confidence < MIN_CONFIDENCE_THRESHOLD) {
    console.log(`Alert rejected: Confidence ${alert.confidence}% < ${MIN_CONFIDENCE_THRESHOLD}%`)
    return false
  }

  // Check days to failure threshold
  if (alert.days_to_next_failure > MAX_DAYS_TO_FAILURE) {
    console.log(`Alert rejected: Days to failure ${alert.days_to_next_failure} > ${MAX_DAYS_TO_FAILURE}`)
    return false
  }

  // Check model R² if available
  if (alert.model_r2 !== undefined && alert.model_r2 < MIN_MODEL_R2) {
    console.log(`Alert rejected: Model R² ${alert.model_r2} < ${MIN_MODEL_R2}`)
    return false
  }

  return true
}

/**
 * Check if location/category is in cooldown period
 */
async function isInCooldownPeriod(
  location: string,
  category: string
): Promise<boolean> {
  const db = await getDb()
  const incidentsCollection = db.collection("incidents")

  const cooldownStart = new Date()
  cooldownStart.setHours(cooldownStart.getHours() - COOLDOWN_PERIOD_HOURS)

  const recentIncident = await incidentsCollection.findOne({
    location,
    category,
    created_at: { $gte: cooldownStart },
    assigned_to: { $exists: true, $ne: null },
  })

  if (recentIncident) {
    console.log(
      `Alert rejected: Location ${location}, category ${category} was assigned within last ${COOLDOWN_PERIOD_HOURS} hours`
    )
    return true
  }

  return false
}

/**
 * Check rate limits
 */
async function checkRateLimits(technicianId: string): Promise<{
  allowed: boolean
  reason?: string
}> {
  const db = await getDb()
  const incidentsCollection = db.collection("incidents")

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  // Check technician-specific rate limit
  const technicianAssignmentsToday = await incidentsCollection.countDocuments({
    assigned_to: new ObjectId(technicianId),
    created_at: { $gte: today, $lt: tomorrow },
    title: { $regex: /^Critical Alert:/i },
  })

  if (technicianAssignmentsToday >= MAX_ASSIGNMENTS_PER_TECHNICIAN_PER_DAY) {
    return {
      allowed: false,
      reason: `Technician has reached daily limit of ${MAX_ASSIGNMENTS_PER_TECHNICIAN_PER_DAY} assignments`,
    }
  }

  // Check system-wide rate limit
  const systemAssignmentsToday = await incidentsCollection.countDocuments({
    created_at: { $gte: today, $lt: tomorrow },
    title: { $regex: /^Critical Alert:/i },
  })

  if (systemAssignmentsToday >= MAX_SYSTEM_WIDE_ASSIGNMENTS_PER_DAY) {
    return {
      allowed: false,
      reason: `System has reached daily limit of ${MAX_SYSTEM_WIDE_ASSIGNMENTS_PER_DAY} auto-assignments`,
    }
  }

  return { allowed: true }
}

/**
 * Check for existing incident within deduplication window
 */
async function findExistingIncident(
  location: string,
  category: string
): Promise<any | null> {
  const db = await getDb()
  const incidentsCollection = db.collection("incidents")

  const windowStart = new Date()
  windowStart.setHours(windowStart.getHours() - DEDUPLICATION_WINDOW_HOURS)

  const existingIncident = await incidentsCollection.findOne({
    location,
    category,
    created_at: { $gte: windowStart },
    status: { $in: ["new", "in-progress", "pending"] },
  })

  return existingIncident
}

/**
 * Create incident from critical alert and assign to technician
 */
export async function createAndAssignCriticalAlert(
  alert: {
    location: string
    category: string
    days_to_next_failure: number
    confidence?: number
    message?: string
    model_r2?: number
  },
  userId?: string
): Promise<{ incidentId: string; technicianId: string; slaDeadline: Date } | null> {
  try {
    // Quality Gate 1: Check if alert passes quality thresholds
    if (!passesQualityGates(alert)) {
      return null
    }

    // Quality Gate 2: Check cooldown period
    if (await isInCooldownPeriod(alert.location, alert.category)) {
      return null
    }

    // Quality Gate 3: Check for existing incident within deduplication window
    const existingIncident = await findExistingIncident(alert.location, alert.category)
    if (existingIncident) {
      console.log(
        `Using existing incident ${existingIncident._id} for ${alert.location} (within ${DEDUPLICATION_WINDOW_HOURS}h window)`
      )
      // Update existing incident if needed, but don't create new assignment
      return null
    }

    // Find appropriate technician
    const technician = await findTechnicianBySpecialization(alert.category)

    if (!technician) {
      console.warn(`No available technician found for category: ${alert.category}`)
      return null
    }

    // Quality Gate 4: Check technician capacity
    if (technician.current_assignments >= technician.max_concurrent) {
      console.log(
        `Technician ${technician.name} is at capacity (${technician.current_assignments}/${technician.max_concurrent})`
      )
      return null // Queue for later instead of assigning
    }

    // Quality Gate 5: Check rate limits
    const rateLimitCheck = await checkRateLimits(technician.id)
    if (!rateLimitCheck.allowed) {
      console.warn(`Rate limit exceeded: ${rateLimitCheck.reason}`)
      return null
    }

    // Get system admin user ID for creating the incident
    // If userId is provided, use it; otherwise, find an admin user
    let incidentUserId = userId
    if (!incidentUserId) {
      const db = await getDb()
      const usersCollection = db.collection("users")
      const admin = await usersCollection.findOne({ role: "admin" })
      if (admin) {
        incidentUserId = admin._id.toString()
      } else {
        // Fallback: use technician ID (not ideal but ensures incident is created)
        incidentUserId = technician.id
      }
    }

    // All quality gates passed, proceed with assignment
    const db = await getDb()
    const incidentsCollection = db.collection("incidents")
    
    // Create incident from critical alert
    const incidentData: CreateIncidentData = {
      user_id: incidentUserId!,
      title: `Critical Alert: Predicted Failure at ${alert.location}`,
      category: alert.category,
      description:
        alert.message ||
        `ML model predicts failure within ${Math.round(alert.days_to_next_failure)} days at ${alert.location}. ` +
        `Confidence: ${alert.confidence || 0}%. ` +
        `This is an automatically generated incident from predictive analytics.`,
      location: alert.location,
      latitude: null,
      longitude: null,
      image_url: null,
    }

    // Skip duplicate check for critical alerts (we handle it manually above)
    const incident = await createIncident(incidentData, true)
    console.log(`Created new incident ${incident.id} for critical alert at ${alert.location}`)

    // Check if already assigned
    const currentIncident = await incidentsCollection.findOne({
      _id: new ObjectId(incident.id!),
    })
    
    // Only assign if not already assigned or if assigned to different technician
    if (currentIncident?.assigned_to && currentIncident.assigned_to.toString() === technician.id) {
      console.log(`Incident ${incident.id} already assigned to technician ${technician.id}`)
      // Update SLA if needed
      const slaDeadline = currentIncident.sla_deadline 
        ? new Date(currentIncident.sla_deadline)
        : new Date(Date.now() + SLA_MINUTES * 60 * 1000)
      
      return {
        incidentId: incident.id!,
        technicianId: technician.id,
        slaDeadline,
      }
    }

    // Calculate SLA deadline (15 minutes from now)
    const slaDeadline = new Date(Date.now() + SLA_MINUTES * 60 * 1000)
    const slaStartedAt = new Date()

    // Auto-assign technician to incident
    let schedule = null
    try {
      schedule = await autoAssignTechnician(
        incident.id!,
        alert.category,
        new Date(Date.now() + 5 * 60 * 1000) // Schedule 5 minutes from now
      )
    } catch (scheduleError: any) {
      console.warn(`Failed to create schedule for incident ${incident.id}:`, scheduleError.message)
    }

    // Always update the incident with assigned_to and SLA, regardless of schedule creation
    const updateResult = await incidentsCollection.updateOne(
      { _id: new ObjectId(incident.id!) },
      {
        $set: {
          assigned_to: new ObjectId(technician.id),
          updated_at: new Date(),
          sla_deadline: slaDeadline,
          sla_started_at: slaStartedAt,
          priority: 5, // Highest priority for critical alerts
          status: currentIncident?.status === "resolved" ? "resolved" : "in-progress", // Don't change if resolved
        },
      }
    )
    
    if (updateResult.modifiedCount > 0) {
      console.log(`Successfully assigned incident ${incident.id} to technician ${technician.id} with SLA deadline ${slaDeadline.toISOString()}`)
    } else {
      console.warn(`Failed to update incident ${incident.id} assignment`)
    }

    // Notify technician about the assignment
    try {
      await createNotification({
        user_id: technician.id,
        type: "assignment",
        message: `You have been assigned a critical alert: ${incidentData.title} at ${alert.location}. SLA: ${SLA_MINUTES} minutes.`,
        metadata: {
          incident_id: incident.id,
          category: alert.category,
          location: alert.location,
          sla_deadline: slaDeadline.toISOString(),
        },
      })
    } catch (notifError) {
      console.error("Failed to send notification to technician:", notifError)
      // Don't fail the assignment if notification fails
    }

    return {
      incidentId: incident.id!,
      technicianId: technician.id,
      slaDeadline,
    }
  } catch (error) {
    console.error("Error creating and assigning critical alert:", error)
    throw error
  }
}

/**
 * Process critical alerts and auto-assign them
 */
export async function processCriticalAlerts(
  alerts: Array<{
    location: string
    category: string
    days_to_next_failure: number
    confidence?: number
    message?: string
  }>,
  userId?: string
): Promise<{
  assigned: number
  failed: number
  results: Array<{
    alert: { location: string; category: string }
    success: boolean
    incidentId?: string
    technicianId?: string
    error?: string
  }>
}> {
  const results: Array<{
    alert: { location: string; category: string }
    success: boolean
    incidentId?: string
    technicianId?: string
    error?: string
  }> = []

  let assigned = 0
  let failed = 0

  for (const alert of alerts) {
    try {
      const result = await createAndAssignCriticalAlert(alert, userId)
      if (result) {
        assigned++
        results.push({
          alert: { location: alert.location, category: alert.category },
          success: true,
          incidentId: result.incidentId,
          technicianId: result.technicianId,
        })
      } else {
        failed++
        results.push({
          alert: { location: alert.location, category: alert.category },
          success: false,
          error: "No available technician found",
        })
      }
    } catch (error: any) {
      failed++
      results.push({
        alert: { location: alert.location, category: alert.category },
        success: false,
        error: error.message || "Unknown error",
      })
    }
  }

  return { assigned, failed, results }
}

