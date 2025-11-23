/**
 * Escalation Service
 * Handles SLA breaches and escalations
 */

import { getIncidents } from "./incident.service"
import { notifySLAExceeded, createNotification } from "./notification.service"
import { getDb } from "@/lib/mongodb"
import { ObjectId } from "mongodb"

const SLA_MINUTES = 15

/**
 * Check for SLA breaches and escalate
 */
export async function checkAndEscalateSLA(): Promise<number> {
  // Check both "new" and "in-progress" incidents that haven't been resolved
  const newIncidents = await getIncidents({
    status: "new",
  })
  const inProgressIncidents = await getIncidents({
    status: "in-progress",
  })
  const incidents = [...newIncidents, ...inProgressIncidents]

  const now = new Date()
  let escalatedCount = 0

  for (const incident of incidents) {
    const createdTime = new Date(incident.created_at)
    const ageMinutes = Math.floor(
      (now.getTime() - createdTime.getTime()) / 60000
    )

    if (ageMinutes > SLA_MINUTES) {
      // Check if already escalated
      const db = await getDb()
      const incidentsCollection = db.collection("incidents")
      
      if (!ObjectId.isValid(incident.id!)) {
        continue
      }

      const currentIncident = await incidentsCollection.findOne({
        _id: new ObjectId(incident.id!),
      })

      if (currentIncident && !currentIncident.escalated) {
        // Mark as escalated
        await incidentsCollection.updateOne(
          { _id: currentIncident._id },
          {
            $set: {
              escalated: true,
              escalated_at: new Date(),
            },
          }
        )

        // Notify user
        await notifySLAExceeded(
          incident.user_id,
          incident.id!,
          incident.title
        )

        // Notify all admins
        const usersCollection = db.collection("users")
        const admins = await usersCollection
          .find({ role: "admin" })
          .toArray()

        for (const admin of admins) {
          await createNotification({
            user_id: admin._id.toString(),
            type: "escalation",
            message: `SLA Breach: Incident "${incident.title}" has exceeded the ${SLA_MINUTES}-minute SLA`,
            metadata: {
              incident_id: incident.id,
              age_minutes: ageMinutes,
            },
          })
        }

        escalatedCount++
      }
    }
  }

  return escalatedCount
}

/**
 * Auto-reschedule if technician unavailable
 */
export async function autoRescheduleUnavailableTechnicians(): Promise<number> {
  const db = await getDb()
  const scheduleCollection = db.collection("technician_schedule")
  const usersCollection = db.collection("users")

  // Get all scheduled assignments
  const scheduledAssignments = await scheduleCollection
    .find({
      status: "scheduled",
      scheduled_time: { $gte: new Date() }, // Future assignments
    })
    .toArray()

  let rescheduledCount = 0

  for (const assignment of scheduledAssignments) {
    if (!ObjectId.isValid(assignment.technician_id)) {
      continue
    }

    const technician = await usersCollection.findOne({
      _id: new ObjectId(assignment.technician_id),
    })

    // Check if technician is unavailable
    if (technician && (!technician.available || !technician.active)) {
      // Get incident to find category
      const { getIncidentById } = await import("./incident.service")
      const incident = await getIncidentById(assignment.incident_id)
      
      if (!incident) {
        continue
      }

      // Find alternative technician
      const { autoAssignTechnician } = await import("./technician.service")
      
      try {
        const newSchedule = await autoAssignTechnician(
          assignment.incident_id,
          incident.category,
          new Date(assignment.scheduled_time)
        )

        if (newSchedule) {
          // Cancel old assignment
          await scheduleCollection.updateOne(
            { _id: assignment._id },
            { $set: { status: "cancelled" } }
          )

          // Notify new technician
          const { notifyTechnicianAssignment } = await import(
            "./notification.service"
          )
          
          await notifyTechnicianAssignment(
            newSchedule.technician_id,
            assignment.incident_id,
            incident.title,
            incident.location
          )

          rescheduledCount++
        }
      } catch (error) {
        console.error(
          `Failed to reschedule assignment ${assignment._id}:`,
          error
        )
      }
    }
  }

  return rescheduledCount
}

