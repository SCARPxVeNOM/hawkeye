/**
 * Incident Updates Service
 * Tracks incident status changes and comments
 */

import { getDb } from "@/lib/mongodb"
import { ObjectId } from "mongodb"

export interface IncidentUpdate {
  id?: string
  incident_id: string
  user_id: string
  status: string
  comment?: string
  created_at: Date | string
}

export interface CreateIncidentUpdateData {
  incident_id: string
  user_id: string
  status: string
  comment?: string
}

/**
 * Format incident update from MongoDB document
 */
function formatIncidentUpdate(update: any): IncidentUpdate {
  return {
    id: update._id.toString(),
    incident_id: update.incident_id,
    user_id: update.user_id,
    status: update.status,
    comment: update.comment,
    created_at: update.created_at instanceof Date
      ? update.created_at.toISOString()
      : update.created_at,
  }
}

/**
 * Create an incident update
 */
export async function createIncidentUpdate(
  data: CreateIncidentUpdateData
): Promise<IncidentUpdate> {
  const db = await getDb()
  const updatesCollection = db.collection("incident_updates")

  const update = {
    incident_id: data.incident_id,
    user_id: data.user_id,
    status: data.status,
    comment: data.comment || null,
    created_at: new Date(),
  }

  const result = await updatesCollection.insertOne(update)

  return {
    id: result.insertedId.toString(),
    ...formatIncidentUpdate(update),
  }
}

/**
 * Get all updates for an incident
 */
export async function getIncidentUpdates(
  incidentId: string
): Promise<IncidentUpdate[]> {
  if (!ObjectId.isValid(incidentId)) {
    throw new Error("Invalid incident ID format")
  }

  const db = await getDb()
  const updatesCollection = db.collection("incident_updates")

  const updates = await updatesCollection
    .find({ incident_id: incidentId })
    .sort({ created_at: -1 })
    .toArray()

  return updates.map(formatIncidentUpdate)
}

/**
 * Get updates by user
 */
export async function getUserIncidentUpdates(
  userId: string,
  limit: number = 50
): Promise<IncidentUpdate[]> {
  const db = await getDb()
  const updatesCollection = db.collection("incident_updates")

  const updates = await updatesCollection
    .find({ user_id: userId })
    .sort({ created_at: -1 })
    .limit(limit)
    .toArray()

  return updates.map(formatIncidentUpdate)
}

