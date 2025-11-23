/**
 * Incident Service
 * Handles all incident-related business logic
 */

import { getDb } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { detectPriority } from "./priority.service"

export interface Incident {
  id?: string
  user_id: string
  title: string
  category: string
  description: string
  image_url?: string | null
  location: string
  latitude?: number | null
  longitude?: number | null
  status: string
  priority: number
  assigned_to?: string | null
  created_at: Date | string
  updated_at: Date | string
  resolved_at?: Date | string | null
  sla_deadline?: Date | string | null
  sla_started_at?: Date | string | null
  completion_image?: string | null
  completed_by?: string | null
  completed_at?: Date | string | null
}

export interface IncidentFilters {
  userId?: string
  status?: string
  category?: string
  assignedTo?: string
  limit?: number
}

export interface CreateIncidentData {
  user_id: string
  title: string
  category: string
  description: string
  image_url?: string | null
  location: string
  latitude?: string | number | null
  longitude?: string | number | null
}

export interface UpdateIncidentData {
  status?: string
  priority?: number
  assigned_to?: string | null
  title?: string
  description?: string
  category?: string
  completion_image?: string | null
  resolved_at?: Date | string | null
  completed_by?: string | null
  completed_at?: Date | string | null
}

/**
 * Format incident from MongoDB document to API response
 */
function formatIncident(incident: any): Incident {
  // Ensure user_id and assigned_to are strings for consistent comparison
  const userId = incident.user_id 
    ? (typeof incident.user_id === 'object' && incident.user_id.toString 
        ? incident.user_id.toString() 
        : String(incident.user_id))
    : incident.user_id
  
  const assignedTo = incident.assigned_to 
    ? (typeof incident.assigned_to === 'object' && incident.assigned_to.toString 
        ? incident.assigned_to.toString() 
        : String(incident.assigned_to))
    : incident.assigned_to

  return {
    id: incident._id.toString(),
    user_id: userId,
    title: incident.title,
    category: incident.category,
    description: incident.description,
    image_url: incident.image_url,
    location: incident.location,
    latitude: incident.latitude,
    longitude: incident.longitude,
    status: incident.status,
    priority: incident.priority,
    assigned_to: assignedTo,
    created_at: incident.created_at instanceof Date 
      ? incident.created_at.toISOString() 
      : incident.created_at,
    updated_at: incident.updated_at instanceof Date 
      ? incident.updated_at.toISOString() 
      : incident.updated_at,
    resolved_at: incident.resolved_at instanceof Date 
      ? incident.resolved_at.toISOString() 
      : incident.resolved_at || null,
    sla_deadline: incident.sla_deadline instanceof Date 
      ? incident.sla_deadline.toISOString() 
      : incident.sla_deadline || null,
    sla_started_at: incident.sla_started_at instanceof Date 
      ? incident.sla_started_at.toISOString() 
      : incident.sla_started_at || null,
    completion_image: incident.completion_image || null,
    completed_by: incident.completed_by 
      ? (typeof incident.completed_by === 'object' && incident.completed_by.toString 
          ? incident.completed_by.toString() 
          : String(incident.completed_by))
      : incident.completed_by || null,
    completed_at: incident.completed_at instanceof Date 
      ? incident.completed_at.toISOString() 
      : incident.completed_at || null,
  }
}

/**
 * Get all incidents with optional filters
 */
export async function getIncidents(filters: IncidentFilters = {}): Promise<Incident[]> {
  try {
    const db = await getDb()
    const incidentsCollection = db.collection("incidents")

    const query: any = {}
    if (filters.userId) {
      query.user_id = filters.userId
    }
    if (filters.status) {
      query.status = filters.status
    }
    if (filters.category) {
      query.category = filters.category
    }
    if (filters.assignedTo) {
      // Handle both string and ObjectId formats for assigned_to
      if (ObjectId.isValid(filters.assignedTo)) {
        query.assigned_to = new ObjectId(filters.assignedTo)
      } else {
        query.assigned_to = filters.assignedTo
      }
    }

    let cursor = incidentsCollection.find(query).sort({ created_at: -1 })
    
    if (filters.limit) {
      cursor = cursor.limit(filters.limit)
    }

    const incidents = await cursor.toArray()

    return incidents.map(formatIncident)
  } catch (error) {
    console.error("Error getting incidents from database:", error)
    // Return empty array if database access fails
    return []
  }
}

/**
 * Get a single incident by ID
 */
export async function getIncidentById(id: string): Promise<Incident | null> {
  if (!ObjectId.isValid(id)) {
    throw new Error("Invalid incident ID format")
  }

  const db = await getDb()
  const incidentsCollection = db.collection("incidents")

  const incident = await incidentsCollection.findOne({
    _id: new ObjectId(id),
  })

  if (!incident) {
    return null
  }

  return formatIncident(incident)
}

/**
 * Check for duplicate incidents (same category, location, and date)
 */
export async function checkDuplicateIncident(
  category: string,
  location: string,
  date: Date = new Date()
): Promise<boolean> {
  const db = await getDb()
  const incidentsCollection = db.collection("incidents")

  const today = new Date(date)
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const existingIncident = await incidentsCollection.findOne({
    category,
    location,
    created_at: {
      $gte: today,
      $lt: tomorrow,
    },
  })

  return !!existingIncident
}

/**
 * Create a new incident
 */
export async function createIncident(data: CreateIncidentData, skipDuplicateCheck: boolean = false): Promise<Incident> {
  // Validate required fields
  if (!data.user_id || !data.title || !data.category || !data.description || !data.location) {
    throw new Error("Missing required fields")
  }

  // Check for duplicates (skip for critical alerts)
  if (!skipDuplicateCheck) {
    const isDuplicate = await checkDuplicateIncident(data.category, data.location)
    if (isDuplicate) {
      throw new Error("An incident for this category and location already exists today")
    }
  }

  // Auto-detect priority
  const priorityResult = detectPriority(data.title, data.description, data.category)

  const db = await getDb()
  const incidentsCollection = db.collection("incidents")

  const newIncident = {
    user_id: data.user_id,
    title: data.title,
    category: data.category,
    description: data.description,
    image_url: data.image_url || null,
    location: data.location,
    latitude: data.latitude ? parseFloat(String(data.latitude)) : null,
    longitude: data.longitude ? parseFloat(String(data.longitude)) : null,
    status: "new",
    priority: priorityResult.priority,
    assigned_to: null,
    created_at: new Date(),
    updated_at: new Date(),
    resolved_at: null,
  }

  const result = await incidentsCollection.insertOne(newIncident)

  return {
    id: result.insertedId.toString(),
    ...formatIncident(newIncident),
  }
}

/**
 * Update an incident
 */
export async function updateIncident(
  id: string,
  data: UpdateIncidentData
): Promise<Incident> {
  if (!ObjectId.isValid(id)) {
    throw new Error("Invalid incident ID format")
  }

  const db = await getDb()
  const incidentsCollection = db.collection("incidents")

  const updateData: any = {
    updated_at: new Date(),
  }

  if (data.status !== undefined) updateData.status = data.status
  if (data.priority !== undefined) updateData.priority = data.priority
  if (data.assigned_to !== undefined) updateData.assigned_to = data.assigned_to ? new ObjectId(data.assigned_to) : null
  if (data.title !== undefined) updateData.title = data.title
  if (data.description !== undefined) updateData.description = data.description
  if (data.category !== undefined) updateData.category = data.category
  if (data.completion_image !== undefined) updateData.completion_image = data.completion_image
  if (data.completed_by !== undefined) updateData.completed_by = data.completed_by ? new ObjectId(data.completed_by) : null
  if (data.completed_at !== undefined) {
    updateData.completed_at = data.completed_at instanceof Date 
      ? data.completed_at 
      : data.completed_at ? new Date(data.completed_at) : null
  }

  // Auto-set resolved_at when status changes to resolved
  if (data.status === "resolved") {
    if (data.resolved_at) {
      updateData.resolved_at = data.resolved_at instanceof Date 
        ? data.resolved_at 
        : new Date(data.resolved_at)
    } else {
      updateData.resolved_at = new Date()
    }
  }

  const result = await incidentsCollection.updateOne(
    { _id: new ObjectId(id) },
    { $set: updateData }
  )

  if (result.matchedCount === 0) {
    throw new Error("Incident not found")
  }

  const updatedIncident = await incidentsCollection.findOne({
    _id: new ObjectId(id),
  })

  if (!updatedIncident) {
    throw new Error("Failed to retrieve updated incident")
  }

  return formatIncident(updatedIncident)
}

/**
 * Delete an incident
 */
export async function deleteIncident(id: string): Promise<void> {
  if (!ObjectId.isValid(id)) {
    throw new Error("Invalid incident ID format")
  }

  const db = await getDb()
  const incidentsCollection = db.collection("incidents")

  const result = await incidentsCollection.deleteOne({
    _id: new ObjectId(id),
  })

  if (result.deletedCount === 0) {
    throw new Error("Incident not found")
  }
}

/**
 * Get incident statistics
 */
export async function getIncidentStats() {
  const db = await getDb()
  const incidentsCollection = db.collection("incidents")

  const [total, active, resolved, byCategory, byStatus] = await Promise.all([
    incidentsCollection.countDocuments(),
    incidentsCollection.countDocuments({
      status: { $in: ["new", "in-progress"] }
    }),
    incidentsCollection.countDocuments({ status: "resolved" }),
    incidentsCollection.aggregate([
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]).toArray(),
    incidentsCollection.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]).toArray(),
  ])

  return {
    total,
    active,
    resolved,
    byCategory: byCategory.map((item: any) => ({
      category: item._id,
      count: item.count
    })),
    byStatus: byStatus.map((item: any) => ({
      status: item._id,
      count: item.count
    })),
  }
}

