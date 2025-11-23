/**
 * Feedback Service
 * Handles technician feedback from students
 */

import { getDb } from "@/lib/mongodb"
import { ObjectId } from "mongodb"

export interface TechnicianFeedback {
  id?: string
  incident_id: string
  technician_id: string
  user_id: string
  rating: number // 1-5 stars
  comment?: string
  created_at: Date | string
}

export interface CreateFeedbackData {
  incident_id: string
  technician_id: string
  user_id: string
  rating: number
  comment?: string
}

/**
 * Format feedback from MongoDB document
 */
function formatFeedback(feedback: any): TechnicianFeedback {
  return {
    id: feedback._id.toString(),
    incident_id: feedback.incident_id,
    technician_id: feedback.technician_id,
    user_id: feedback.user_id,
    rating: feedback.rating,
    comment: feedback.comment || "",
    created_at: feedback.created_at instanceof Date
      ? feedback.created_at.toISOString()
      : feedback.created_at,
  }
}

/**
 * Create a new feedback
 */
export async function createFeedback(data: CreateFeedbackData): Promise<TechnicianFeedback> {
  const db = await getDb()
  const feedbackCollection = db.collection("technician_feedback")

  // Check if feedback already exists for this incident
  const existing = await feedbackCollection.findOne({
    incident_id: data.incident_id,
    user_id: data.user_id,
  })

  if (existing) {
    throw new Error("Feedback already submitted for this incident")
  }

  // Validate rating
  if (data.rating < 1 || data.rating > 5) {
    throw new Error("Rating must be between 1 and 5")
  }

  const feedback = {
    incident_id: data.incident_id,
    technician_id: data.technician_id,
    user_id: data.user_id,
    rating: data.rating,
    comment: data.comment || "",
    created_at: new Date(),
  }

  const result = await feedbackCollection.insertOne(feedback)

  return {
    id: result.insertedId.toString(),
    ...formatFeedback(feedback),
  }
}

/**
 * Get feedback for a technician
 */
export async function getTechnicianFeedback(technicianId: string): Promise<TechnicianFeedback[]> {
  const db = await getDb()
  const feedbackCollection = db.collection("technician_feedback")

  // Query by technician_id (should match exactly as stored)
  const feedbacks = await feedbackCollection
    .find({ technician_id: technicianId })
    .sort({ created_at: -1 })
    .toArray()

  console.log(`Found ${feedbacks.length} feedback entries for technician ${technicianId}`)
  if (feedbacks.length > 0) {
    console.log("Sample feedback:", feedbacks[0])
  }

  return feedbacks.map(formatFeedback)
}

/**
 * Get feedback for an incident
 */
export async function getIncidentFeedback(incidentId: string): Promise<TechnicianFeedback | null> {
  const db = await getDb()
  const feedbackCollection = db.collection("technician_feedback")

  const feedback = await feedbackCollection.findOne({ incident_id: incidentId })

  if (!feedback) {
    return null
  }

  return formatFeedback(feedback)
}

/**
 * Get feedback statistics for a technician
 */
export async function getTechnicianFeedbackStats(technicianId: string) {
  const feedbacks = await getTechnicianFeedback(technicianId)

  if (feedbacks.length === 0) {
    return {
      total_feedback: 0,
      average_rating: 0,
      rating_distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    }
  }

  const ratings = feedbacks.map((f) => f.rating)
  const averageRating =
    ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length

  const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  ratings.forEach((rating) => {
    ratingDistribution[rating as keyof typeof ratingDistribution]++
  })

  return {
    total_feedback: feedbacks.length,
    average_rating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
    rating_distribution: ratingDistribution,
  }
}

